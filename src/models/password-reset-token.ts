import { Schema, model, Model, Document } from 'mongoose';

export interface IPasswordResetToken extends Document {
    email: string;
    tokenHash: string; // SHA-256 hash of the raw token
    expiresAt: Date;
    isUsed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPasswordResetTokenModel extends Model<IPasswordResetToken> {
    findValidToken(email: string, tokenHash: string): Promise<IPasswordResetToken | null>;
    invalidateAllForEmail(email: string): Promise<any>;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: [true, 'Token hash is required'],
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            index: { expireAfterSeconds: 0 }, // TTL auto-cleanup
        },
        isUsed: {
            type: Boolean,
            required: true,
            default: false,
            index: true,
        },
    },
    { timestamps: true },
);

passwordResetTokenSchema.index({ email: 1, isUsed: 1 });

passwordResetTokenSchema.statics.findValidToken = function (
    email: string,
    tokenHash: string,
): Promise<IPasswordResetToken | null> {
    return this.findOne({
        email,
        tokenHash,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    }).exec();
};

passwordResetTokenSchema.statics.invalidateAllForEmail = function (email: string) {
    return this.updateMany({ email, isUsed: false }, { $set: { isUsed: true } }).exec();
};

export default model<IPasswordResetToken, IPasswordResetTokenModel>(
    'PasswordResetToken',
    passwordResetTokenSchema,
);

