import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class LogErrorSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  stack?: string;
}

@Schema({
  timestamps: true,
  // TTL index for automatic cleanup - logs expire after 30 days
  expireAfterSeconds: 30 * 24 * 60 * 60
})
export class SystemLogDocument extends Document {
  @Prop({ required: true })
  level: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  service: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: LogErrorSchema })
  error?: LogErrorSchema;

  @Prop()
  requestId?: string;

  @Prop()
  userId?: string;

  @Prop()
  ip?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLogDocument);

// Indexes for better query performance
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ service: 1, timestamp: -1 });
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ requestId: 1 });
SystemLogSchema.index({ userId: 1 });

// Text index for full-text search across message and service
SystemLogSchema.index({
  message: 'text',
  service: 'text'
}, {
  name: 'log_search_index',
  default_language: 'english'
});

// TTL index on timestamp for automatic document expiration
SystemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });