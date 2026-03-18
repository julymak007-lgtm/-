"""
SIPLACE SX2 生存分析模型训练脚本
用于部件剩余使用寿命预测
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime

# 生存分析库
from lifelines import WeibullAFTFitter, CoxPHFitter, RandomSurvivalForest
from lifelines.utils import concordance_index
from sklearn.preprocessing import StandardScaler

# 数据库
import psycopg2


class SurvivalTrainer:
    """生存分析模型训练器 - 用于部件寿命预测"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.model_type = config.get("model_type", "survival")
        self.target_label_type = config.get("target_label_type", "nozzle_clog")
        
        # 模型选择
        self.survival_model_type = config.get("survival_model_type", "weibull")
        
        # 数据库
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
    
    def load_survival_data(self) -> pd.DataFrame:
        """
        加载生存分析数据
        
        需要的数据：
        - duration: 持续时间（使用时长）
        - event: 是否发生故障（事件）
        - 协变量：各种特征
        """
        query = """
            SELECT 
                dc.id as component_id,
                dc.pick_count,
                dc.service_hours,
                dc.last_replaced_at,
                dc.expected_life,
                -- 计算生存时间
                COALESCE(
                    EXTRACT(EPOCH FROM (NOW() - dc.last_replaced_at))/3600,
                    dc.service_hours
                ) as duration_hours,
                -- 是否发生故障（右删失数据）
                CASE WHEN dc.status = 'error' THEN 1 ELSE 0 END as event,
                -- 设备参数特征
                AVG(CASE WHEN dp.parameter_name = 'Nozzle_Vacuum_Level' THEN dp.parameter_value END) as vacuum_mean,
                STDDEV(CASE WHEN dp.parameter_name = 'Nozzle_Vacuum_Level' THEN dp.parameter_value END) as vacuum_std
            FROM device_components dc
            LEFT JOIN device_parameters dp 
                ON dp.device_id = dc.device_id
                AND dp.component_id = dc.id
            WHERE dc.component_type = 'nozzle'
            GROUP BY dc.id
        """
        
        df = pd.read_sql(query, self.db_conn)
        
        print(f"✅ 加载生存数据: {len(df)} 条")
        print(f"   故障数: {df['event'].sum()}")
        print(f"   删失数: {len(df) - df['event'].sum()}")
        
        return df
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """准备生存分析特征"""
        # 特征工程
        features = df[[
            'pick_count',
            'service_hours',
            'vacuum_mean',
            'vacuum_std'
        ]].copy()
        
        # 处理缺失值
        features = features.fillna(0)
        
        # 持续时间（小时）
        durations = df['duration_hours'].values
        
        # 事件发生指示
        events = df['event'].values
        
        return features, durations, events
    
    def build_model(self):
        """构建生存分析模型"""
        if self.survival_model_type == "weibull":
            self.model = WeibullAFTFitter()
            print("✅ Weibull AFT模型")
        elif self.survival_model_type == "cox":
            self.model = CoxPHFitter()
            print("✅ Cox PH模型")
        elif self.survival_model_type == "random_survival_forest":
            self.model = RandomSurvivalForest()
            print("✅ 随机生存森林模型")
        else:
            raise ValueError(f"未知的模型类型: {self.survival_model_type}")
        
        return self.model
    
    def train(self, features: pd.DataFrame, durations: np.ndarray, events: np.ndarray) -> Dict:
        """训练生存分析模型"""
        print("🚀 开始训练生存分析模型...")
        
        # 构建数据格式
        train_df = features.copy()
        train_df['duration'] = durations
        train_df['event'] = events
        
        # 构建并训练
        self.build_model()
        self.model.fit(train_df, duration_col='duration', event_col='event')
        
        # 打印模型摘要
        if hasattr(self.model, 'print_summary'):
            self.model.print_summary()
        
        # 计算C-index
        pred_hazard = self.model.predict_hazard(features)
        c_index = concordance_index(durations, -pred_hazard.mean(axis=1), events)
        
        print(f"✅ 训练完成, C-index: {c_index:.4f}")
        
        return {
            "training_metrics": {
                "c_index": float(c_index),
            }
        }
    
    def predict_survival_function(self, features: pd.DataFrame) -> pd.DataFrame:
        """预测生存函数"""
        if not self.model:
            raise Exception("模型未训练")
        
        # 预测未来24小时的生存概率
        times = np.arange(1, 25)  # 1-24小时
        survival_functions = self.model.predict_survival_function(features, times=times)
        
        return survival_functions
    
    def run_full_training(self, training_id: str) -> Dict:
        """运行完整训练流程"""
        print("=" * 60)
        print(f"生存分析训练任务: {training_id}")
        print("=" * 60)
        
        results = {}
        
        try:
            # 连接数据库
            if not self.connect_db():
                raise Exception("数据库连接失败")
            
            # 加载数据
            df = self.load_survival_data()
            
            results["train_sample_count"] = len(df)
            results["fault_sample_count"] = int(df['event'].sum())
            results["normal_sample_count"] = len(df) - results["fault_sample_count"]
            
            # 准备特征
            features, durations, events = self.prepare_features(df)
            
            # 训练
            training_results = self.train(features, durations, events)
            results.update(training_results)
            
            # 生存分析使用C-index
            results["evaluation_metrics"] = {
                "c_index": training_results["training_metrics"]["c_index"],
            }
            
            print("=" * 60)
            print("🎉 生存分析训练完成!")
            print("=" * 60)
            
            return results
            
        except Exception as e:
            print(f"❌ 训练失败: {e}")
            results["error_message"] = str(e)
            return results


if __name__ == "__main__":
    # 示例配置
    config = {
        "model_type": "survival",
        "target_label_type": "nozzle_life",
        "survival_model_type": "weibull"
    }
    
    trainer = SurvivalTrainer(config)
    results = trainer.run_full_training("survival-demo-001")
    print(json.dumps(results, indent=2))
