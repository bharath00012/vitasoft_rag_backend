import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  sessionId: string;
  messages: {
    role: string;
    text: string;
    timestamp: Date;
  }[];
  file?: {
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: Date;
  };
  chunkCount?: number; 
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    messages: [
      {
        role: { type: String },
        text: { type: String },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    file: {
      filename: String,
      originalName: String,
      path: String,
      uploadedAt: Date,
    },

    chunkCount: {           // ✅ ADD THIS
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Session: Model<ISession> =
  mongoose.models.Session ||
  mongoose.model<ISession>("Session", SessionSchema);

export default Session;