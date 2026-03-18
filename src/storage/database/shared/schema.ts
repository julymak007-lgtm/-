import { pgTable, serial, timestamp, varchar, integer, doublePrecision, boolean, jsonb, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 系统健康检查表（Supabase系统表，禁止删除或修改）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============================================
// 设备管理相关表
// ============================================

// 设备表
export const devices = pgTable(
  "devices",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceCode: varchar("device_code", { length: 50 }).notNull().unique(), // 设备编号，如 SX2-01
    deviceName: varchar("device_name", { length: 100 }).notNull(), // 设备名称
    deviceType: varchar("device_type", { length: 50 }).notNull().default("SIPLACE SX2"), // 设备型号
    location: varchar("location", { length: 100 }), // 设备位置
    status: varchar("status", { length: 20 }).notNull().default("online"), // online, offline, maintenance
    healthScore: doublePrecision("health_score").default(100), // 健康度评分 0-100
    lastMaintenanceAt: timestamp("last_maintenance_at", { withTimezone: true }),
    nextMaintenanceAt: timestamp("next_maintenance_at", { withTimezone: true }),
    metadata: jsonb("metadata"), // 扩展信息
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("devices_device_code_idx").on(table.deviceCode),
    index("devices_status_idx").on(table.status),
  ]
);

// 设备部件表（吸嘴、送料器等）
export const deviceComponents = pgTable(
  "device_components",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    componentCode: varchar("component_code", { length: 50 }).notNull(), // 部件编号，如 Nozzle-01
    componentName: varchar("component_name", { length: 100 }).notNull(), // 部件名称
    componentType: varchar("component_type", { length: 50 }).notNull(), // nozzle, feeder, etc.
    status: varchar("status", { length: 20 }).notNull().default("normal"), // normal, warning, error
    pickCount: integer("pick_count").default(0), // 拾取次数
    serviceHours: doublePrecision("service_hours").default(0), // 服务时长
    lastReplacedAt: timestamp("last_replaced_at", { withTimezone: true }),
    expectedLife: integer("expected_life"), // 预期寿命（小时）
    survivalProb: doublePrecision("survival_prob"), // 生存概率（24小时）
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("device_components_device_id_idx").on(table.deviceId),
    index("device_components_type_idx").on(table.componentType),
  ]
);

// 设备参数历史表（实时采集数据）
export const deviceParameters = pgTable(
  "device_parameters",
  {
    id: serial().notNull().primaryKey(),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    componentId: varchar("component_id", { length: 36 }), // 关联部件ID（可选）
    parameterName: varchar("parameter_name", { length: 100 }).notNull(), // 参数名
    parameterValue: doublePrecision("parameter_value").notNull(), // 参数值
    unit: varchar("unit", { length: 20 }), // 单位
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("device_parameters_device_id_idx").on(table.deviceId),
    index("device_parameters_recorded_at_idx").on(table.recordedAt),
  ]
);

// ============================================
// 预警与预测相关表
// ============================================

// 预警事件表
export const alerts = pgTable(
  "alerts",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    componentId: varchar("component_id", { length: 36 }), // 关联部件
    alertType: varchar("alert_type", { length: 50 }).notNull(), // 预警类型：nozzle_clog, pressure_anomaly, etc.
    severity: varchar("severity", { length: 20 }).notNull(), // critical, high, medium, low
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, acknowledged, resolved, false_alarm
    probability: doublePrecision("probability"), // 故障概率 0-1
    modelType: varchar("model_type", { length: 50 }), // lstm, survival, rule_engine
    predictedFailureTime: timestamp("predicted_failure_time", { withTimezone: true }), // 预测故障时间
    keyEvidence: jsonb("key_evidence"), // 关键证据数据
    aiExplanation: text("ai_explanation"), // AI生成的解释文本
    acknowledgedBy: varchar("acknowledged_by", { length: 100 }), // 确认人
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: text("resolution"), // 解决方案
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("alerts_device_id_idx").on(table.deviceId),
    index("alerts_status_idx").on(table.status),
    index("alerts_created_at_idx").on(table.createdAt),
  ]
);

// ============================================
// 工单管理相关表
// ============================================

// 工单表
export const workOrders = pgTable(
  "work_orders",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // 工单编号
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    alertId: varchar("alert_id", { length: 36 }), // 关联预警ID
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"), // 故障描述
    faultAnalysis: text("fault_analysis"), // AI生成的根因分析
    inspectionSteps: jsonb("inspection_steps"), // 排查步骤数组
    requiredParts: jsonb("required_parts"), // 所需备件
    safetyNotes: text("safety_notes"), // 安全注意事项
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // urgent, high, medium, low
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, assigned, in_progress, completed, cancelled
    assignedTo: varchar("assigned_to", { length: 100 }), // 分配给
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    actualSolution: text("actual_solution"), // 实际解决方案
    replacedParts: jsonb("replaced_parts"), // 实际更换的部件
    feedback: text("feedback"), // 反馈
    createdBy: varchar("created_by", { length: 100 }), // 创建人
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("work_orders_device_id_idx").on(table.deviceId),
    index("work_orders_status_idx").on(table.status),
    index("work_orders_created_at_idx").on(table.createdAt),
  ]
);

// ============================================
// 知识库与日志相关表
// ============================================

// 知识库表
export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(), // manual, case, faq, sop
    deviceType: varchar("device_type", { length: 50 }), // 适用设备型号
    content: text("content").notNull(),
    keywords: jsonb("keywords"), // 关键词数组
    embedding: jsonb("embedding"), // 向量嵌入（用于RAG）
    source: varchar("source", { length: 100 }), // 来源
    viewCount: integer("view_count").default(0),
    helpfulCount: integer("helpful_count").default(0),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("knowledge_base_category_idx").on(table.category),
    index("knowledge_base_device_type_idx").on(table.deviceType),
  ]
);

// 维修日志表
export const maintenanceLogs = pgTable(
  "maintenance_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    workOrderId: varchar("work_order_id", { length: 36 }), // 关联工单
    logType: varchar("log_type", { length: 50 }).notNull(), // repair, inspection, replacement
    rawContent: text("raw_content"), // 原始文本内容
    structuredData: jsonb("structured_data"), // AI提取的结构化数据
    faultPhenomenon: text("fault_phenomenon"), // 故障现象
    rootCause: text("root_cause"), // 根本原因
    solution: text("solution"), // 解决措施
    replacedComponents: jsonb("replaced_components"), // 更换部件
    duration: integer("duration"), // 维修时长（分钟）
    technician: varchar("technician", { length: 100 }), // 维修人员
    logDate: timestamp("log_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_logs_device_id_idx").on(table.deviceId),
    index("maintenance_logs_log_type_idx").on(table.logType),
  ]
);

// 聊天会话表
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 100 }), // 用户ID
    title: varchar("title", { length: 200 }),
    messages: jsonb("messages").notNull().default([]), // 消息历史
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("chat_sessions_user_id_idx").on(table.userId),
  ]
);

// ============================================
// 预测模型相关表
// ============================================

// 标注数据表
export const labeledData = pgTable(
  "labeled_data",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    componentId: varchar("component_id", { length: 36 }), // 可选关联部件
    
    // 数据时间窗口
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    
    // 标注标签
    labelType: varchar("label_type", { length: 50 }).notNull(), // nozzle_clog, pressure_failure, etc.
    isFault: boolean("is_fault").notNull().default(false), // 是否发生故障
    faultSeverity: varchar("fault_severity", { length: 20 }), // minor, moderate, severe
    faultTime: timestamp("fault_time", { withTimezone: true }), // 故障发生时间
    
    // 特征数据（存储计算后的特征）
    features: jsonb("features"), // { "vacuum_mean": -65, "vacuum_std": 2.3, ... }
    
    // 标注信息
    labeledBy: varchar("labeled_by", { length: 100 }), // 标注人
    labelConfidence: doublePrecision("label_confidence").default(1.0), // 标注置信度
    notes: text("notes"), // 标注备注
    
    // 用于训练
    isUsedForTraining: boolean("is_used_for_training").default(true),
    trainSplit: varchar("train_split", { length: 20 }).default("train"), // train, val, test
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("labeled_data_device_id_idx").on(table.deviceId),
    index("labeled_data_label_type_idx").on(table.labelType),
    index("labeled_data_is_fault_idx").on(table.isFault),
    index("labeled_data_train_split_idx").on(table.trainSplit),
  ]
);

// 模型训练记录表
export const modelTrainings = pgTable(
  "model_trainings",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    modelName: varchar("model_name", { length: 100 }).notNull(), // lstm_nozzle_clog, survival_analysis, etc.
    modelType: varchar("model_type", { length: 50 }).notNull(), // lstm, survival, rule_engine
    targetLabelType: varchar("target_label_type", { length: 50 }).notNull(), // 预测的目标类型
    
    // 训练配置
    config: jsonb("config").notNull(), // { "epochs": 50, "batch_size": 32, ... }
    hyperparameters: jsonb("hyperparameters"), // 超参数
    
    // 训练数据统计
    trainSampleCount: integer("train_sample_count").default(0),
    valSampleCount: integer("val_sample_count").default(0),
    testSampleCount: integer("test_sample_count").default(0),
    faultSampleCount: integer("fault_sample_count").default(0),
    normalSampleCount: integer("normal_sample_count").default(0),
    
    // 训练指标
    trainingMetrics: jsonb("training_metrics"), // 训练过程指标（loss曲线等）
    evaluationMetrics: jsonb("evaluation_metrics"), // { "precision": 0.85, "recall": 0.82, "f1": 0.83, ... }
    
    // 模型状态
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, training, completed, failed
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    
    // 模型文件（可以存储到对象存储）
    modelPath: varchar("model_path", { length: 500 }), // ONNX模型路径
    isDeployed: boolean("is_deployed").default(false), // 是否已部署
    deployedAt: timestamp("deployed_at", { withTimezone: true }),
    
    // 版本信息
    version: integer("version").default(1),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("model_trainings_model_type_idx").on(table.modelType),
    index("model_trainings_status_idx").on(table.status),
    index("model_trainings_is_deployed_idx").on(table.isDeployed),
  ]
);

// 预测结果历史表
export const predictionHistory = pgTable(
  "prediction_history",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id", { length: 36 }).notNull().references(() => devices.id),
    componentId: varchar("component_id", { length: 36 }),
    
    // 预测信息
    modelId: varchar("model_id", { length: 36 }).references(() => modelTrainings.id),
    modelName: varchar("model_name", { length: 100 }),
    predictionType: varchar("prediction_type", { length: 50 }).notNull(), // classification, survival
    
    // 预测结果
    predictionResult: jsonb("prediction_result").notNull(), // { "probability": 0.85, "class": "nozzle_clog" }
    confidence: doublePrecision("confidence"),
    
    // 实际结果（用于事后验证）
    actualResult: jsonb("actual_result"),
    isCorrect: boolean("is_correct"),
    
    // 关联的预警
    alertId: varchar("alert_id", { length: 36 }).references(() => alerts.id),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("prediction_history_device_id_idx").on(table.deviceId),
    index("prediction_history_model_id_idx").on(table.modelId),
    index("prediction_history_created_at_idx").on(table.createdAt),
  ]
);

// ============================================
// Zod Schemas for Validation
// ============================================

const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Device schemas
export const insertDeviceSchema = createCoercedInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDeviceSchema = createCoercedInsertSchema(devices)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

// Alert schemas
export const insertAlertSchema = createCoercedInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAlertSchema = createCoercedInsertSchema(alerts)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

// WorkOrder schemas
export const insertWorkOrderSchema = createCoercedInsertSchema(workOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWorkOrderSchema = createCoercedInsertSchema(workOrders)
  .omit({
    id: true,
    orderNumber: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

// KnowledgeBase schemas
export const insertKnowledgeSchema = createCoercedInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// MaintenanceLog schemas
export const insertMaintenanceLogSchema = createCoercedInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
});

// ChatSession schemas
export const insertChatSessionSchema = createCoercedInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// LabeledData schemas
export const insertLabeledDataSchema = createCoercedInsertSchema(labeledData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLabeledDataSchema = createCoercedInsertSchema(labeledData)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

// ModelTraining schemas
export const insertModelTrainingSchema = createCoercedInsertSchema(modelTrainings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateModelTrainingSchema = createCoercedInsertSchema(modelTrainings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

// ============================================
// TypeScript Types
// ============================================

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type UpdateDevice = z.infer<typeof updateDeviceSchema>;

export type DeviceComponent = typeof deviceComponents.$inferSelect;
export type DeviceParameter = typeof deviceParameters.$inferSelect;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type UpdateAlert = z.infer<typeof updateAlertSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type UpdateWorkOrder = z.infer<typeof updateWorkOrderSchema>;

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;

export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type LabeledData = typeof labeledData.$inferSelect;
export type InsertLabeledData = z.infer<typeof insertLabeledDataSchema>;
export type UpdateLabeledData = z.infer<typeof updateLabeledDataSchema>;

export type ModelTraining = typeof modelTrainings.$inferSelect;
export type InsertModelTraining = z.infer<typeof insertModelTrainingSchema>;
export type UpdateModelTraining = z.infer<typeof updateModelTrainingSchema>;

export type PredictionHistory = typeof predictionHistory.$inferSelect;
