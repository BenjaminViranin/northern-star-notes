import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://wppotmzzhjmyibqdgqax.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcG90bXp6aGpteWlicWRncWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2Nzc3MzgsImV4cCI6MjA3MjI1MzczOH0.8FNLEqJUnsLYyacfDtqFsJNduOo3yjG3C7hBUuue9yc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          color: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          version: number;
          is_deleted: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          is_deleted?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          is_deleted?: boolean;
        };
      };
      notes: {
        Row: {
          id: string;
          title: string;
          content: any; // JSONB
          content_markdown: string;
          content_plain: string;
          group_id: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
          version: number;
          is_deleted: boolean;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title?: string;
          content?: any;
          content_markdown?: string;
          content_plain?: string;
          group_id?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: any;
          content_markdown?: string;
          content_plain?: string;
          group_id?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
      };
      sync_operations: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          operation: string;
          data: any;
          user_id: string;
          created_at: string;
          processed: boolean;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          operation: string;
          data?: any;
          user_id: string;
          created_at?: string;
          processed?: boolean;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          operation?: string;
          data?: any;
          user_id?: string;
          created_at?: string;
          processed?: boolean;
        };
      };
    };
  };
}

export type Group = Database['public']['Tables']['groups']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type SyncOperation =
  Database['public']['Tables']['sync_operations']['Row'];
