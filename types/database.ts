export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PetType = "dog" | "cat";

export type ReadingStatus =
  | "free_created"
  | "payment_pending"
  | "paid"
  | "premium_created";

export type PaymentProvider = "kakaopay" | "paypal" | "mock";

export type ProductType =
  | "premium_report"
  | "pdf_report"
  | "guardian_match"
  | "two_pet_match"
  | "yearly_fortune";

export type PaymentStatus = "pending" | "approved" | "failed" | "canceled";

export type Database = {
  public: {
    Tables: {
      pets: {
        Row: {
          id: string;
          name: string;
          type: PetType;
          birth_date: string | null;
          birth_time: string | null;
          birth_time_unknown: boolean;
          adoption_date: string | null;
          owner_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: PetType;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_time_unknown?: boolean;
          adoption_date?: string | null;
          owner_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: PetType;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_time_unknown?: boolean;
          adoption_date?: string | null;
          owner_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      readings: {
        Row: {
          id: string;
          pet_id: string;
          free_summary: string;
          premium_report: string | null;
          status: ReadingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          free_summary: string;
          premium_report?: string | null;
          status?: ReadingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          free_summary?: string;
          premium_report?: string | null;
          status?: ReadingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "readings_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          reading_id: string;
          provider: PaymentProvider;
          product_type: ProductType;
          amount: number;
          currency: string;
          status: PaymentStatus;
          provider_order_id: string | null;
          provider_tid: string | null;
          provider_payment_id: string | null;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reading_id: string;
          provider: PaymentProvider;
          product_type?: ProductType;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          provider_order_id?: string | null;
          provider_tid?: string | null;
          provider_payment_id?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reading_id?: string;
          provider?: PaymentProvider;
          product_type?: ProductType;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          provider_order_id?: string | null;
          provider_tid?: string | null;
          provider_payment_id?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_reading_id_fkey";
            columns: ["reading_id"];
            isOneToOne: false;
            referencedRelation: "readings";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          product_type: ProductType;
          name: string;
          price: number;
          currency: string;
          description: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          product_type: ProductType;
          name: string;
          price: number;
          currency?: string;
          description?: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          product_type?: ProductType;
          name?: string;
          price?: number;
          currency?: string;
          description?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          id: string;
          tester_name: string | null;
          contact: string | null;
          pet_type: PetType | null;
          page: string;
          rating: number;
          message: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tester_name?: string | null;
          contact?: string | null;
          pet_type?: PetType | null;
          page?: string;
          rating: number;
          message: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tester_name?: string | null;
          contact?: string | null;
          pet_type?: PetType | null;
          page?: string;
          rating?: number;
          message?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      pet_type: PetType;
      reading_status: ReadingStatus;
      payment_provider: PaymentProvider;
      product_type: ProductType;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
