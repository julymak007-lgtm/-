"""
SIPLACE SX2 LSTM 模型训练脚本
真正的后端训练实现
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# 机器学习库
import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score

# 数据库
import psycopg2
from psycopg2.extras import RealDictCursor


class LSTMTrainer:
    """LSTM模型训练器"""
    
    def __init__(self, config: Dict):
        """
        初始化训练器
        
        Args:
            config: 训练配置
                {
                    "model_type": "lstm",
                    "target_label_type": "nozzle_clog",
                    "config": {
                        "epochs": 50,
                        "batch_size": 32,
                        "learning_rate": 0.001
                    },
                    "hyperparameters": {
                        "lstm_units": [64, 32],
                        "dropout": 0.2
                    }
                }
        """
        self.config = config
        self.model_type = config.get("model_type", "lstm")
        self.target_label_type = config.get("target_label_type", "nozzle_clog")
        
        # 训练参数
        self.train_config = config.get("config", {})
        self.epochs = self.train_config.get("epochs", 50)
        self.batch_size = self.train_config.get("batch_size", 32)
        self.learning_rate = self.train_config.get("learning_rate", 0.001)
        
        # 超参数
        self.hyperparams = config.get("hyperparameters", {})
        self.lstm_units = self.hyperparams.get("lstm_units", [64, 32])
        self.dropout = self.hyperparams.get("dropout", 0.2)
        
        # 时间窗口设置（根据PRD：4小时 = 240分钟）
        self.sequence_length = 240  # 240个时间步（每分钟一个）
        self.n_features = 20  # 20个特征
        
        # 数据库连接
        self.db_conn = None
        
        # 模型
        self.model = None
        self.scaler = StandardScaler()
        
    def connect_db(self):
        """连接数据库"""
        try:
            self.db_conn = psycopg2.connect(
                host=os.getenv("SUPABASE_HOST"),
                database=os.getenv("SUPABASE_DB"),
                user=os.getenv("SUPABASE_USER"),
                password=os.getenv("SUPABASE_PASSWORD"),
                port=os.getenv("SUPABASE_PORT", "5432")
            )
            print("✅ 数据库连接成功")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False
    
    def load_labeled_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        从数据库加载标注数据
        
        Returns:
            (train_df, val_df, test_df)
        """
        if not self.db_conn:
            raise Exception("数据库未连接")
        
        query = """
            SELECT 
                ld.*,
                dp.parameter_name,
                dp.parameter_value,
                dp.recorded_at
            FROM labeled_data ld
            LEFT JOIN device_parameters dp 
                ON dp.device_id = ld.device_id
                AND dp.recorded_at >= ld.start_time
                AND dp.recorded_at <= ld.end_time
            WHERE ld.is_used_for_training = true
            ORDER BY ld.start_time, dp.recorded_at
        """
        
        df = pd.read_sql(query, self.db_conn)
        print(f"✅ 加载数据: {len(df)} 条记录")
        
        # 按数据集拆分
        train_df = df[df["train_split"] == "train"]
        val_df = df[df["train_split"] == "val"]
        test_df = df[df["train_split"] == "test"]
        
        print(f"   训练集: {len(train_df)} 条")
        print(f"   验证集: {len(val_df)} 条")
        print(f"   测试集: {len(test_df)} 条")
        
        return train_df, val_df, test_df
    
    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        从原始参数数据提取特征
        
        根据PRD，提取以下特征：
        - 原始特征：直接采集的30+个参数
        - 统计特征：滑动窗口的均值、标准差、斜率
        - 领域特征：CPH效率、热应力标志、单位抛料率
        """
        # 这里是示例，实际需要根据真实参数进行调整
        features_list = []
        
        # 按设备和时间窗口分组
        grouped = df.groupby(["device_id", "start_time", "end_time"])
        
        for (device_id, start_time, end_time), group in grouped:
            # 提取统计特征
            features = {}
            
            # 真空度相关特征
            vacuum_data = group[group["parameter_name"] == "Nozzle_Vacuum_Level"]
            if len(vacuum_data) > 0:
                features["vacuum_mean"] = vacuum_data["parameter_value"].mean()
                features["vacuum_std"] = vacuum_data["parameter_value"].std()
                features["vacuum_min"] = vacuum_data["parameter_value"].min()
                features["vacuum_max"] = vacuum_data["parameter_value"].max()
                
                # 计算斜率（趋势）
                if len(vacuum_data) > 1:
                    x = np.arange(len(vacuum_data))
                    slope, _ = np.polyfit(x, vacuum_data["parameter_value"], 1)
                    features["vacuum_slope"] = slope
            
            # 气压相关特征
            pressure_data = group[group["parameter_name"] == "Main_Air_Pressure"]
            if len(pressure_data) > 0:
                features["pressure_mean"] = pressure_data["parameter_value"].mean()
                features["pressure_std"] = pressure_data["parameter_value"].std()
            
            # 抛料率相关
            rejection_data = group[group["parameter_name"] == "RejectionRate"]
            if len(rejection_data) > 0:
                features["rejection_rate_mean"] = rejection_data["parameter_value"].mean()
                features["rejection_rate_max"] = rejection_data["parameter_value"].max()
            
            features_list.append(features)
        
        # 转换为numpy数组
        feature_names = list(features_list[0].keys()) if features_list else []
        X = np.array([[f.get(name, 0) for name in feature_names] for f in features_list])
        
        return X
    
    def prepare_sequences(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        准备LSTM序列数据
        
        输入形状: (samples, sequence_length, n_features)
        输出形状: (samples, 1)
        """
        sequences = []
        labels = []
        
        for i in range(len(X) - self.sequence_length):
            sequences.append(X[i:i + self.sequence_length])
            labels.append(y[i + self.sequence_length])
        
        return np.array(sequences), np.array(labels)
    
    def build_model(self) -> Model:
        """
        构建LSTM模型
        
        根据PRD的模型架构：
        - 第一层LSTM（64单元，返回序列）
        - Dropout (0.2)
        - 第二层LSTM（32单元）
        - Dropout (0.2)
        - 全连接层 (16单元, ReLU激活)
        - 输出层 (1单元, Sigmoid激活)
        """
        model = Sequential([
            # 第一层 LSTM
            LSTM(
                self.lstm_units[0],
                return_sequences=True,
                input_shape=(self.sequence_length, self.n_features)
            ),
            Dropout(self.dropout),
            
            # 第二层 LSTM
            LSTM(self.lstm_units[1]),
            Dropout(self.dropout),
            
            # 全连接层
            Dense(16, activation='relu'),
            
            # 输出层 - 二分类
            Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=self.learning_rate),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        print("✅ 模型构建成功")
        model.summary()
        
        return model
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray, 
              X_val: np.ndarray, y_val: np.ndarray) -> Dict:
        """
        训练模型
        
        Returns:
            训练指标和历史
        """
        print("🚀 开始训练...")
        
        # 构建模型
        self.model = self.build_model()
        
        # 回调函数
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ModelCheckpoint(
                f'models/{self.model_type}_{self.target_label_type}_best.h5',
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            )
        ]
        
        # 训练
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=self.epochs,
            batch_size=self.batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        print("✅ 训练完成")
        
        return {
            "training_metrics": {
                "final_loss": float(history.history['loss'][-1]),
                "epochs_trained": len(history.history['loss']),
                "history": {
                    "loss": [float(x) for x in history.history['loss']],
                    "val_loss": [float(x) for x in history.history['val_loss']],
                    "accuracy": [float(x) for x in history.history['accuracy']],
                    "val_accuracy": [float(x) for x in history.history['val_accuracy']]
                }
            }
        }
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """
        评估模型
        
        Returns:
            评估指标（精确率、召回率、F1、准确率）
        """
        if not self.model:
            raise Exception("模型未训练")
        
        print("📊 开始评估...")
        
        # 预测
        y_pred_proba = self.model.predict(X_test)
        y_pred = (y_pred_proba > 0.5).astype(int).flatten()
        
        # 计算指标
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        accuracy = accuracy_score(y_test, y_pred)
        
        metrics = {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "accuracy": float(accuracy)
        }
        
        print(f"✅ 评估完成")
        print(f"   精确率: {precision:.4f}")
        print(f"   召回率: {recall:.4f}")
        print(f"   F1值: {f1:.4f}")
        print(f"   准确率: {accuracy:.4f}")
        
        return metrics
    
    def save_model(self, model_path: str):
        """保存模型为ONNX格式（用于生产部署）"""
        if not self.model:
            raise Exception("模型未训练")
        
        # 转换为ONNX
        import tf2onnx
        import onnx
        
        # 转换
        input_signature = [tf.TensorSpec(
            (None, self.sequence_length, self.n_features), 
            tf.float32, 
            name='input'
        )]
        
        onnx_model, _ = tf2onnx.convert.from_keras(
            self.model,
            input_signature=input_signature,
            opset=13
        )
        
        # 保存
        onnx.save(onnx_model, model_path)
        print(f"✅ 模型已保存: {model_path}")
        
        return model_path
    
    def run_full_training(self, training_id: str) -> Dict:
        """
        运行完整的训练流程
        
        Args:
            training_id: 训练任务ID
            
        Returns:
            完整的训练结果
        """
        print("=" * 60)
        print(f"开始训练任务: {training_id}")
        print(f"模型类型: {self.model_type}")
        print(f"预测目标: {self.target_label_type}")
        print("=" * 60)
        
        results = {}
        
        try:
            # 1. 连接数据库
            if not self.connect_db():
                raise Exception("数据库连接失败")
            
            # 2. 加载标注数据
            train_df, val_df, test_df = self.load_labeled_data()
            
            # 更新样本统计
            results["train_sample_count"] = len(train_df)
            results["val_sample_count"] = len(val_df)
            results["test_sample_count"] = len(test_df)
            results["fault_sample_count"] = len(train_df[train_df["is_fault"] == True])
            results["normal_sample_count"] = len(train_df[train_df["is_fault"] == False])
            
            # 3. 提取特征
            print("🔍 提取特征...")
            X_train = self.extract_features(train_df)
            X_val = self.extract_features(val_df)
            X_test = self.extract_features(test_df)
            
            # 4. 标准化
            print("📐 标准化特征...")
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_val_scaled = self.scaler.transform(X_val)
            X_test_scaled = self.scaler.transform(X_test)
            
            # 5. 准备标签
            y_train = train_df.groupby(["device_id", "start_time", "end_time"])["is_fault"].first().values
            y_val = val_df.groupby(["device_id", "start_time", "end_time"])["is_fault"].first().values
            y_test = test_df.groupby(["device_id", "start_time", "end_time"])["is_fault"].first().values
            
            # 6. 准备序列
            print("📦 准备LSTM序列...")
            X_train_seq, y_train_seq = self.prepare_sequences(X_train_scaled, y_train)
            X_val_seq, y_val_seq = self.prepare_sequences(X_val_scaled, y_val)
            X_test_seq, y_test_seq = self.prepare_sequences(X_test_scaled, y_test)
            
            # 7. 训练
            training_results = self.train(X_train_seq, y_train_seq, X_val_seq, y_val_seq)
            results.update(training_results)
            
            # 8. 评估
            evaluation_metrics = self.evaluate(X_test_seq, y_test_seq)
            results["evaluation_metrics"] = evaluation_metrics
            
            # 9. 保存模型
            model_path = f"models/{training_id}.onnx"
            os.makedirs("models", exist_ok=True)
            self.save_model(model_path)
            results["model_path"] = model_path
            
            print("=" * 60)
            print("🎉 训练任务完成!")
            print("=" * 60)
            
            return results
            
        except Exception as e:
            print(f"❌ 训练失败: {e}")
            results["error_message"] = str(e)
            return results


def main():
    """主函数 - 命令行调用示例"""
    import argparse
    
    parser = argparse.ArgumentParser(description='LSTM模型训练')
    parser.add_argument('--config', type=str, required=True, help='配置JSON文件路径')
    parser.add_argument('--training-id', type=str, required=True, help='训练任务ID')
    
    args = parser.parse_args()
    
    # 加载配置
    with open(args.config, 'r') as f:
        config = json.load(f)
    
    # 创建训练器
    trainer = LSTMTrainer(config)
    
    # 运行训练
    results = trainer.run_full_training(args.training_id)
    
    # 输出结果
    output_file = f"results/{args.training_id}_results.json"
    os.makedirs("results", exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"📝 结果已保存: {output_file}")


if __name__ == "__main__":
    main()
