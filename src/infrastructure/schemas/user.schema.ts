import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  collection: 'users'
})
export class UserDocument extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  phone?: string;

  @Prop()
  cpf?: string;

  @Prop()
  city?: string;

  @Prop()
  educationLevel?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ enum: ['Presencial', 'Remoto'] })
  participationMode?: string;

  @Prop()
  registeredAt?: Date;

  @Prop({ default: Date.now })
  importedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);

// Indexes for better query performance
UserSchema.index({ importedAt: -1 });