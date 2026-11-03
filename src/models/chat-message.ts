import { Schema, model, Types } from 'mongoose';

export type MessageType = 'text' | 'voice';

export interface IChatMessage {
  enquiryId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  content: string;
  messageType: MessageType;
  voiceDuration?: number;
  voiceUrl?: string;
  timestamp: Date;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true },
    senderId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName:    { type: String, required: true },
    content:       { type: String, required: true },
    messageType:   { type: String, enum: ['text', 'voice'], default: 'text' },
    voiceDuration: { type: Number },
    voiceUrl:      { type: String },
    timestamp:     { type: Date, default: Date.now },
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

chatMessageSchema.index({ enquiryId: 1, timestamp: 1 });

export default model<IChatMessage>('ChatMessage', chatMessageSchema);
