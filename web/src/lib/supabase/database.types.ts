// Hand-authored to match supabase/migrations/0001_init.sql. Once a live
// Supabase project exists, regenerate with:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
// and diff against this file before overwriting.
//
// Shape matters here: @supabase/postgrest-js's GenericSchema requires each
// table to declare Row/Insert/Update/Relationships, and the schema itself
// needs Tables/Views/Functions all present -- omitting any of these doesn't
// error at `createClient<Database>()`, it just silently resolves every query
// result to `never` downstream. Relationships must list the actual FKs used
// in an embedded select (e.g. `saves(*)` from board_saves) or that embed's
// type resolution breaks too.

export type MediaType = "image" | "gif" | "video";
export type ReactionType = "like" | "dislike";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_path: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_path?: string | null;
          is_private?: boolean;
        };
        Update: Partial<{
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_path: string | null;
          is_private: boolean;
        }>;
        Relationships: [];
      };
      boards: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          is_private?: boolean;
        };
        Update: Partial<{
          title: string;
          description: string | null;
          is_private: boolean;
        }>;
        Relationships: [];
      };
      saves: {
        Row: {
          id: string;
          owner_id: string;
          storage_path: string;
          media_type: MediaType;
          mime_type: string;
          file_size_bytes: number | null;
          width: number | null;
          height: number | null;
          source_url: string;
          source_title: string | null;
          caption: string | null;
          is_private: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          storage_path: string;
          media_type: MediaType;
          mime_type: string;
          file_size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          source_url: string;
          source_title?: string | null;
          caption?: string | null;
          is_private?: boolean;
          position: number;
        };
        Update: Partial<{
          caption: string | null;
          is_private: boolean;
          position: number;
        }>;
        Relationships: [];
      };
      board_saves: {
        Row: {
          board_id: string;
          save_id: string;
          owner_id: string;
          position: number;
          added_at: string;
        };
        Insert: {
          board_id: string;
          save_id: string;
          owner_id: string;
          position: number;
        };
        Update: Partial<{
          position: number;
        }>;
        Relationships: [
          {
            foreignKeyName: "board_saves_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_saves_save_id_fkey";
            columns: ["save_id"];
            isOneToOne: false;
            referencedRelation: "saves";
            referencedColumns: ["id"];
          },
        ];
      };
      save_reactions: {
        Row: {
          save_id: string;
          user_id: string;
          reaction: ReactionType;
          created_at: string;
        };
        Insert: {
          save_id: string;
          user_id: string;
          reaction: ReactionType;
        };
        Update: Partial<{
          reaction: ReactionType;
        }>;
        Relationships: [
          {
            foreignKeyName: "save_reactions_save_id_fkey";
            columns: ["save_id"];
            isOneToOne: false;
            referencedRelation: "saves";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          save_id: string;
          user_id: string;
          parent_comment_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          save_id: string;
          user_id: string;
          parent_comment_id?: string | null;
          body: string;
        };
        Update: Partial<{
          body: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "comments_save_id_fkey";
            columns: ["save_id"];
            isOneToOne: false;
            referencedRelation: "saves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      comment_reactions: {
        Row: {
          comment_id: string;
          user_id: string;
          reaction: ReactionType;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          reaction: ReactionType;
        };
        Update: Partial<{
          reaction: ReactionType;
        }>;
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_access_tokens: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          name: string;
          last_used_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          name?: string;
        };
        Update: Partial<{
          last_used_at: string | null;
          revoked_at: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
