import { Schema, model, Model } from 'mongoose';

export interface IOTP {
  mobileNumber: string;
  otp: string;
  expiresAt: Date;
  isVerified: boolean;
  attempts: number;
  registrationName?: string; // Temporary name storage during registration
  createdAt: Date;
  isValid(): boolean;
  isExpired(): boolean;
}

export interface IOTPModel extends Model<IOTP> {
  findLatestByMobileNumber(mobileNumber: string): Promise<IOTP | null>;
  findValidOTP(mobileNumber: string, otp: string): Promise<IOTP | null>;
  incrementAttempts(mobileNumber: string, otp: string): Promise<any>;
  markAsVerified(mobileNumber: string, otp: string): Promise<any>;
  invalidateAllForMobile(mobileNumber: string): Promise<any>;
}

const otpSchema = new Schema<IOTP>(
  {
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      index: true,
      match: [/^[0-9]{10,15}$/, 'Please enter a valid mobile number'],
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry time is required'],
      default: () => {
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
        return new Date(Date.now() + expiryMinutes * 60 * 1000);
      },
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    registrationName: {
      type: String,
      maxLength: [100, 'Name must be less than 100 characters'],
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
otpSchema.index({ mobileNumber: 1, createdAt: -1 });

// Instance method to check if OTP is valid
otpSchema.methods.isValid = function (): boolean {
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
  return !this.isVerified && this.expiresAt > new Date() && this.attempts < maxAttempts;
};

// Instance method to check if OTP is expired
otpSchema.methods.isExpired = function (): boolean {
  return this.expiresAt <= new Date();
};

// Static method to find latest OTP for a mobile number
otpSchema.statics.findLatestByMobileNumber = function (mobileNumber: string) {
  return this.findOne({ mobileNumber })
    .sort({ createdAt: -1 })
    .exec();
};

// Static method to find valid OTP for a mobile number
otpSchema.statics.findValidOTP = function (mobileNumber: string, otp: string) {
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
  return this.findOne({
    mobileNumber,
    otp,
    isVerified: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: maxAttempts },
  }).exec();
};

// Static method to increment attempts
otpSchema.statics.incrementAttempts = function (mobileNumber: string, otp: string) {
  return this.updateOne(
    { mobileNumber, otp },
    { $inc: { attempts: 1 } },
  ).exec();
};

// Static method to mark OTP as verified
otpSchema.statics.markAsVerified = function (mobileNumber: string, otp: string) {
  return this.updateOne(
    { mobileNumber, otp },
    { $set: { isVerified: true } },
  ).exec();
};

// Static method to invalidate all OTPs for a mobile number
otpSchema.statics.invalidateAllForMobile = function (mobileNumber: string) {
  return this.updateMany(
    { mobileNumber, isVerified: false },
    { $set: { isVerified: true } },
  ).exec();
};

export default model<IOTP, IOTPModel>('OTP', otpSchema);


