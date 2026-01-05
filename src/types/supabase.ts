export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      artifacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          status: Database["public"]["Enums"]["artifact_status"];
          validation_status: Database["public"]["Enums"]["validation_status"];
          image_count: number;
          capture_mode: Database["public"]["Enums"]["capture_mode"] | null;
          last_capture_at: string | null;
          manual_uploaded_at: string | null;
          device_completed_at: string | null;
          validation_notes: string | null;
          thumbnail_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          status?: Database["public"]["Enums"]["artifact_status"];
          validation_status?: Database["public"]["Enums"]["validation_status"];
          image_count?: number;
          capture_mode?: Database["public"]["Enums"]["capture_mode"] | null;
          last_capture_at?: string | null;
          manual_uploaded_at?: string | null;
          device_completed_at?: string | null;
          validation_notes?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["artifact_status"];
          validation_status?: Database["public"]["Enums"]["validation_status"];
          image_count?: number;
          capture_mode?: Database["public"]["Enums"]["capture_mode"] | null;
          last_capture_at?: string | null;
          manual_uploaded_at?: string | null;
          device_completed_at?: string | null;
          validation_notes?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artifacts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      capture_sessions: {
        Row: {
          id: string;
          artifact_id: string;
          user_id: string;
          capture_mode: Database["public"]["Enums"]["capture_mode"];
          status: Database["public"]["Enums"]["session_status"];
          uploaded_images: number;
          notes: string | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          artifact_id: string;
          user_id: string;
          capture_mode: Database["public"]["Enums"]["capture_mode"];
          status?: Database["public"]["Enums"]["session_status"];
          uploaded_images?: number;
          notes?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          artifact_id?: string;
          user_id?: string;
          capture_mode?: Database["public"]["Enums"]["capture_mode"];
          status?: Database["public"]["Enums"]["session_status"];
          uploaded_images?: number;
          notes?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "capture_sessions_artifact_id_fkey";
            columns: ["artifact_id"];
            referencedRelation: "artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "capture_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      artifact_images: {
        Row: {
          id: string;
          session_id: string;
          artifact_id: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          uploaded_at: string;
          checksum: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          artifact_id: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          uploaded_at?: string;
          checksum?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          artifact_id?: string;
          user_id?: string;
          storage_path?: string;
          mime_type?: string;
          file_size?: number;
          uploaded_at?: string;
          checksum?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artifact_images_artifact_id_fkey";
            columns: ["artifact_id"];
            referencedRelation: "artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifact_images_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "capture_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifact_images_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      artifact_status: "created" | "images_collected" | "processing" | "ready" | "error";
      validation_status: "pending" | "in_progress" | "passed" | "failed";
      capture_mode: "device" | "manual";
      session_status: "created" | "active" | "completed" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
}
