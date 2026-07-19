export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: boolean
          privacy_email: string | null
          support_email: string | null
          updated_at: string
          whatsapp_support: string | null
        }
        Insert: {
          id?: boolean
          privacy_email?: string | null
          support_email?: string | null
          updated_at?: string
          whatsapp_support?: string | null
        }
        Update: {
          id?: boolean
          privacy_email?: string | null
          support_email?: string | null
          updated_at?: string
          whatsapp_support?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      checkin_authorizations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_authorizations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_at: string
          checked_by: string | null
          event_id: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          event_id?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          event_id?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_cents: number | null
          discount_percent: number | null
          id: string
          max_uses: number | null
          seller_id: string | null
          uses_count: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          id?: string
          max_uses?: number | null
          seller_id?: string | null
          uses_count?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          id?: string
          max_uses?: number | null
          seller_id?: string | null
          uses_count?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          duration_minutes: number | null
          id: string
          module_id: string
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          duration_minutes?: number | null
          id?: string
          module_id: string
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          duration_minutes?: number | null
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          duration_hours: number | null
          featured: boolean
          id: string
          instructor_name: string | null
          is_demo: boolean
          price_cents: number
          producer_name: string | null
          published: boolean
          sales_count: number
          seller_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          featured?: boolean
          id?: string
          instructor_name?: string | null
          is_demo?: boolean
          price_cents?: number
          producer_name?: string | null
          published?: boolean
          sales_count?: number
          seller_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          featured?: boolean
          id?: string
          instructor_name?: string | null
          is_demo?: boolean
          price_cents?: number
          producer_name?: string | null
          published?: boolean
          sales_count?: number
          seller_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_id: string | null
          progress: number
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          progress?: number
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          age_rating: string | null
          category: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          featured: boolean
          id: string
          is_demo: boolean
          producer_name: string | null
          published: boolean
          sales_count: number
          seller_id: string | null
          slug: string
          starts_at: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          age_rating?: string | null
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          is_demo?: boolean
          producer_name?: string | null
          published?: boolean
          sales_count?: number
          seller_id?: string | null
          slug: string
          starts_at: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          age_rating?: string | null
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          is_demo?: boolean
          producer_name?: string | null
          published?: boolean
          sales_count?: number
          seller_id?: string | null
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          course_id: string | null
          event_id: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          ticket_batch_id: string | null
          title: string
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          course_id?: string | null
          event_id?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          ticket_batch_id?: string | null
          title: string
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          course_id?: string | null
          event_id?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          ticket_batch_id?: string | null
          title?: string
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_batch_id_fkey"
            columns: ["ticket_batch_id"]
            isOneToOne: false
            referencedRelation: "ticket_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_cpf: string | null
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          coupon_code: string | null
          created_at: string
          discount_cents: number
          expires_at: string | null
          external_reference: string | null
          fee_cents: number
          id: string
          paid_at: string | null
          payment_fee_cents: number
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents: number
          seller_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_cpf?: string | null
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_cents?: number
          expires_at?: string | null
          external_reference?: string | null
          fee_cents?: number
          id?: string
          paid_at?: string | null
          payment_fee_cents?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_cpf?: string | null
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_cents?: number
          expires_at?: string | null
          external_reference?: string | null
          fee_cents?: number
          id?: string
          paid_at?: string | null
          payment_fee_cents?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          expires_at: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          provider: string | null
          provider_payment_id: string | null
          provider_ref: string | null
          raw_status: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          expires_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          provider_ref?: string | null
          raw_status?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          paid_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          provider_ref?: string | null
          raw_status?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fees: {
        Row: {
          active: boolean
          created_at: string
          fixed_cents: number
          id: string
          name: string
          percent: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          fixed_cents?: number
          id?: string
          name: string
          percent?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          fixed_cents?: number
          id?: string
          name?: string
          percent?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          price_cents: number
          published: boolean
          seller_id: string | null
          slug: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_demo?: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          price_cents?: number
          published?: boolean
          seller_id?: string | null
          slug: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          price_cents?: number
          published?: boolean
          seller_id?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          payment_id: string
          reason: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          payment_id: string
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_accounts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          document: string | null
          id: string
          legal_name: string | null
          status: Database["public"]["Enums"]["seller_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          document?: string | null
          id?: string
          legal_name?: string | null
          status?: Database["public"]["Enums"]["seller_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          document?: string | null
          id?: string
          legal_name?: string | null
          status?: Database["public"]["Enums"]["seller_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stock_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          quantity: number
          released: boolean
          ticket_batch_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          quantity: number
          released?: boolean
          ticket_batch_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          quantity?: number
          released?: boolean
          ticket_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_ticket_batch_id_fkey"
            columns: ["ticket_batch_id"]
            isOneToOne: false
            referencedRelation: "ticket_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_batches: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          max_per_order: number
          name: string
          price_cents: number
          quantity_sold: number
          quantity_total: number
          sort_order: number
          starts_at: string | null
          ticket_type_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          max_per_order?: number
          name: string
          price_cents: number
          quantity_sold?: number
          quantity_total: number
          sort_order?: number
          starts_at?: string | null
          ticket_type_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          max_per_order?: number
          name?: string
          price_cents?: number
          quantity_sold?: number
          quantity_total?: number
          sort_order?: number
          starts_at?: string | null
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_batches_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          sector: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          sector?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          sector?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          batch_name: string | null
          buyer_id: string
          code: string
          created_at: string
          event_id: string
          holder_name: string | null
          id: string
          order_item_id: string
          sector: string | null
          status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          batch_name?: string | null
          buyer_id: string
          code: string
          created_at?: string
          event_id: string
          holder_name?: string | null
          id?: string
          order_item_id: string
          sector?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          batch_name?: string | null
          buyer_id?: string
          code?: string
          created_at?: string
          event_id?: string
          holder_name?: string | null
          id?: string
          order_item_id?: string
          sector?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      available_stock: { Args: { _batch_id: string }; Returns: number }
      create_course_draft_order: {
        Args: {
          _buyer_id: string
          _course_id: string
          _platform_fee_bps?: number
          _reservation_minutes?: number
        }
        Returns: string
      }
      create_event_draft_order: {
        Args: {
          _batch_id: string
          _buyer_id: string
          _event_id: string
          _platform_fee_bps?: number
          _quantity: number
          _reservation_minutes?: number
        }
        Returns: string
      }
      expire_stale_reservations: { Args: never; Returns: undefined }
      get_course_outline: { Args: { _course_id: string }; Returns: Json }
      get_lesson_video: { Args: { _lesson_id: string }; Returns: string }
      get_public_seller: {
        Args: { _seller_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          status: Database["public"]["Enums"]["seller_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_ticket: {
        Args: { _code: string }
        Returns: {
          checked_at: string
          event_id: string
          event_title: string
          holder_name: string
          result: string
          sector: string
          ticket_id: string
        }[]
      }
    }
    Enums: {
      app_role: "buyer" | "producer" | "admin" | "checkin_staff"
      order_status: "pending" | "paid" | "cancelled" | "refunded" | "expired"
      payment_method: "pix" | "credit_card"
      payment_status: "pending" | "approved" | "rejected" | "refunded"
      product_kind: "event" | "course" | "digital"
      seller_status: "pending" | "approved" | "suspended"
      ticket_status: "valid" | "used" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["buyer", "producer", "admin", "checkin_staff"],
      order_status: ["pending", "paid", "cancelled", "refunded", "expired"],
      payment_method: ["pix", "credit_card"],
      payment_status: ["pending", "approved", "rejected", "refunded"],
      product_kind: ["event", "course", "digital"],
      seller_status: ["pending", "approved", "suspended"],
      ticket_status: ["valid", "used", "cancelled"],
    },
  },
} as const
