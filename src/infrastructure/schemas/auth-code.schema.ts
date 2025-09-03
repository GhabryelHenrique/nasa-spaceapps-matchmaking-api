import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  collection: 'authcodes'
})
export class AuthCodeDocument extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  usedAt?: Date;
}

export const AuthCodeSchema = SchemaFactory.createForClass(AuthCodeDocument);

// Indexes for better query performance and TTL

AuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
AuthCodeSchema.index({ createdAt: -1 });