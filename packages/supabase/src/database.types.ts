/**
 * GENERIERT — nicht von Hand bearbeiten.
 *
 * Quelle:  Supabase-Projekt "Bautakt" (bxivzvmlcnaxqlytumvz, eu-central-1)
 * Stand:   2026-08-26
 *
 * Neu erzeugen:
 *   npx supabase gen types typescript --project-id bxivzvmlcnaxqlytumvz \
 *     > packages/supabase/src/database.types.ts
 *   (Header danach wieder voranstellen.)
 *
 * Das Schema gehoert dem Repo bautakt-app. Aenderungen daran passieren
 * ausschliesslich dort in supabase/migrations/ — dieses Repo liest nur.
 * Nach jeder Schema-Aenderung diese Datei neu erzeugen.
 */

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          decision_note: string | null
          employment_id: string
          end_date: string
          id: string
          modified_at: string | null
          note: string
          requested_by_user_id: string
          start_date: string
          status: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_note?: string | null
          employment_id: string
          end_date: string
          id: string
          modified_at?: string | null
          note?: string
          requested_by_user_id: string
          start_date: string
          status?: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_note?: string | null
          employment_id?: string
          end_date?: string
          id?: string
          modified_at?: string | null
          note?: string
          requested_by_user_id?: string
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_decided_by_user_id_fkey"
            columns: ["decided_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          company_id: string
          created_at: string
          description: string
          ean: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_favorite: boolean
          min_stock: number | null
          modified_at: string | null
          purchase_price: number | null
          sale_price: number | null
          stock_quantity: number | null
          storage_location: string | null
          supplier_article_number: string | null
          title: string
          unit: string
          usage_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string
          ean?: string | null
          icon?: string | null
          id: string
          is_active?: boolean
          is_favorite?: boolean
          min_stock?: number | null
          modified_at?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          stock_quantity?: number | null
          storage_location?: string | null
          supplier_article_number?: string | null
          title: string
          unit?: string
          usage_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          ean?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          min_stock?: number | null
          modified_at?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          stock_quantity?: number | null
          storage_location?: string | null
          supplier_article_number?: string | null
          title?: string
          unit?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          company_id: string
          created_at: string
          description: string
          ends_at: string
          event_type: string
          id: string
          is_cancelled: boolean
          modified_at: string | null
          parent_event_id: string | null
          recurrence_id: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          company_id: string
          created_at?: string
          description?: string
          ends_at: string
          event_type: string
          id: string
          is_cancelled?: boolean
          modified_at?: string | null
          parent_event_id?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          starts_at: string
          title?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          company_id?: string
          created_at?: string
          description?: string
          ends_at?: string
          event_type?: string
          id?: string
          is_cancelled?: boolean
          modified_at?: string | null
          parent_event_id?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          assigned_employment_id: string | null
          checklist_id: string
          company_id: string
          created_at: string
          done_at: string | null
          due_date: string | null
          id: string
          is_done: boolean
          modified_at: string | null
          position: number
          title: string
        }
        Insert: {
          assigned_employment_id?: string | null
          checklist_id: string
          company_id: string
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id: string
          is_done?: boolean
          modified_at?: string | null
          position?: number
          title?: string
        }
        Update: {
          assigned_employment_id?: string | null
          checklist_id?: string
          company_id?: string
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          modified_at?: string | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_assigned_employment_id_fkey"
            columns: ["assigned_employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          company_id: string
          created_at: string
          id: string
          modified_at: string | null
          order_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          auto_collection: boolean
          auto_first_dunning: boolean
          auto_payment_reminder: boolean
          auto_second_dunning: boolean
          bank_name: string | null
          banner_image_url: string | null
          bic: string | null
          city: string | null
          collection_days_after_due: number | null
          country: string | null
          created_at: string
          creator_id: string
          currency: string
          email: string | null
          first_dunning_days_after_due: number | null
          iban: string | null
          id: string
          invoice_accent_color: string
          invoice_footer_text: string
          invoice_intro_text: string
          invoice_prefix: string | null
          is_small_business: boolean | null
          logo_image_url: string | null
          logo_url: string | null
          modified_at: string | null
          name: string | null
          next_invoice_number: number
          payment_term_days: number
          phone_number: string | null
          postal_code: string | null
          reminder_days_after_due: number | null
          second_dunning_days_after_due: number | null
          street_address: string | null
          tax_number: string | null
          team_size: string | null
          trade_register: string | null
          type: string | null
          vat_id: string | null
        }
        Insert: {
          auto_collection?: boolean
          auto_first_dunning?: boolean
          auto_payment_reminder?: boolean
          auto_second_dunning?: boolean
          bank_name?: string | null
          banner_image_url?: string | null
          bic?: string | null
          city?: string | null
          collection_days_after_due?: number | null
          country?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          email?: string | null
          first_dunning_days_after_due?: number | null
          iban?: string | null
          id?: string
          invoice_accent_color?: string
          invoice_footer_text?: string
          invoice_intro_text?: string
          invoice_prefix?: string | null
          is_small_business?: boolean | null
          logo_image_url?: string | null
          logo_url?: string | null
          modified_at?: string | null
          name?: string | null
          next_invoice_number?: number
          payment_term_days?: number
          phone_number?: string | null
          postal_code?: string | null
          reminder_days_after_due?: number | null
          second_dunning_days_after_due?: number | null
          street_address?: string | null
          tax_number?: string | null
          team_size?: string | null
          trade_register?: string | null
          type?: string | null
          vat_id?: string | null
        }
        Update: {
          auto_collection?: boolean
          auto_first_dunning?: boolean
          auto_payment_reminder?: boolean
          auto_second_dunning?: boolean
          bank_name?: string | null
          banner_image_url?: string | null
          bic?: string | null
          city?: string | null
          collection_days_after_due?: number | null
          country?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          email?: string | null
          first_dunning_days_after_due?: number | null
          iban?: string | null
          id?: string
          invoice_accent_color?: string
          invoice_footer_text?: string
          invoice_intro_text?: string
          invoice_prefix?: string | null
          is_small_business?: boolean | null
          logo_image_url?: string | null
          logo_url?: string | null
          modified_at?: string | null
          name?: string | null
          next_invoice_number?: number
          payment_term_days?: number
          phone_number?: string | null
          postal_code?: string | null
          reminder_days_after_due?: number | null
          second_dunning_days_after_due?: number | null
          street_address?: string | null
          tax_number?: string | null
          team_size?: string | null
          trade_register?: string | null
          type?: string | null
          vat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_absence_settings: {
        Row: {
          annual_leave_days: number
          company_id: string
          counts_weekends_as_leave: boolean
          created_at: string
          modified_at: string | null
        }
        Insert: {
          annual_leave_days?: number
          company_id: string
          counts_weekends_as_leave?: boolean
          created_at?: string
          modified_at?: string | null
        }
        Update: {
          annual_leave_days?: number
          company_id?: string
          counts_weekends_as_leave?: boolean
          created_at?: string
          modified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_absence_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_finance_settings: {
        Row: {
          calculatory_owner_salary: number
          company_id: string
          created_at: string
          default_tax_rate_percent: number
          material_overhead_percent: number
          modified_at: string | null
          overhead_per_hour: number
          productive_hours_per_year: number
          profit_risk_percent: number
          vat_accounting: string
        }
        Insert: {
          calculatory_owner_salary?: number
          company_id: string
          created_at?: string
          default_tax_rate_percent?: number
          material_overhead_percent?: number
          modified_at?: string | null
          overhead_per_hour?: number
          productive_hours_per_year?: number
          profit_risk_percent?: number
          vat_accounting?: string
        }
        Update: {
          calculatory_owner_salary?: number
          company_id?: string
          created_at?: string
          default_tax_rate_percent?: number
          material_overhead_percent?: number
          modified_at?: string | null
          overhead_per_hour?: number
          productive_hours_per_year?: number
          profit_risk_percent?: number
          vat_accounting?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_roles: {
        Row: {
          company_id: string
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          sort_order: number
          system_key: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions: Json
          sort_order?: number
          system_key?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          sort_order?: number
          system_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_system: boolean
          kind: string
          modified_at: string | null
          name: string
          parent_id: string | null
          skr03_account: string | null
          skr04_account: string | null
          slug: string | null
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          kind: string
          modified_at?: string | null
          name: string
          parent_id?: string | null
          skr03_account?: string | null
          skr04_account?: string | null
          slug?: string | null
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          modified_at?: string | null
          name?: string
          parent_id?: string | null
          skr03_account?: string | null
          skr04_account?: string | null
          slug?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          modified_at: string | null
          name: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          name: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_city: string
          billing_country: string
          billing_postal_code: string
          billing_street: string
          buyer_reference: string
          city: string
          company_id: string
          company_name: string
          country: string
          created_at: string
          customer_number: string | null
          customer_type: string
          discount_days: number | null
          discount_percent: number | null
          email: string
          first_name: string
          id: string
          is_construction_business: boolean
          last_name: string
          modified_at: string | null
          notes: string
          payment_term_days: number | null
          phone: string
          postal_code: string
          street_address: string
          tax_exemption_valid_until: string | null
          vat_id: string
        }
        Insert: {
          billing_city?: string
          billing_country?: string
          billing_postal_code?: string
          billing_street?: string
          buyer_reference?: string
          city?: string
          company_id: string
          company_name?: string
          country?: string
          created_at?: string
          customer_number?: string | null
          customer_type?: string
          discount_days?: number | null
          discount_percent?: number | null
          email?: string
          first_name?: string
          id: string
          is_construction_business?: boolean
          last_name?: string
          modified_at?: string | null
          notes?: string
          payment_term_days?: number | null
          phone?: string
          postal_code?: string
          street_address?: string
          tax_exemption_valid_until?: string | null
          vat_id?: string
        }
        Update: {
          billing_city?: string
          billing_country?: string
          billing_postal_code?: string
          billing_street?: string
          buyer_reference?: string
          city?: string
          company_id?: string
          company_name?: string
          country?: string
          created_at?: string
          customer_number?: string | null
          customer_type?: string
          discount_days?: number | null
          discount_percent?: number | null
          email?: string
          first_name?: string
          id?: string
          is_construction_business?: boolean
          last_name?: string
          modified_at?: string | null
          notes?: string
          payment_term_days?: number | null
          phone?: string
          postal_code?: string
          street_address?: string
          tax_exemption_valid_until?: string | null
          vat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_employees: {
        Row: {
          employment_id: string
          report_id: string
        }
        Insert: {
          employment_id: string
          report_id: string
        }
        Update: {
          employment_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_employees_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_employees_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          company_id: string
          created_at: string
          id: string
          materials: string
          modified_at: string | null
          notes: string
          order_id: string
          report_date: string
          special_occurrences: string
          temperature_afternoon: number | null
          temperature_morning: number | null
          user_id: string
          weather_afternoon: string
          weather_morning: string
          work_done: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id: string
          materials?: string
          modified_at?: string | null
          notes?: string
          order_id: string
          report_date: string
          special_occurrences?: string
          temperature_afternoon?: number | null
          temperature_morning?: number | null
          user_id: string
          weather_afternoon?: string
          weather_morning?: string
          work_done?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          materials?: string
          modified_at?: string | null
          notes?: string
          order_id?: string
          report_date?: string
          special_occurrences?: string
          temperature_afternoon?: number | null
          temperature_morning?: number | null
          user_id?: string
          weather_afternoon?: string
          weather_morning?: string
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_number_sequences: {
        Row: {
          company_id: string
          doc_type: string
          next_number: number
          prefix: string
        }
        Insert: {
          company_id: string
          doc_type: string
          next_number?: number
          prefix?: string
        }
        Update: {
          company_id?: string
          doc_type?: string
          next_number?: number
          prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_number_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_notices: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          fee_amount: number
          id: string
          interest_amount: number
          level: number
          notice_date: string
          sent_at: string | null
          storage_path: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          fee_amount?: number
          id?: string
          interest_amount?: number
          level: number
          notice_date?: string
          sent_at?: string | null
          storage_path?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          fee_amount?: number
          id?: string
          interest_amount?: number
          level?: number
          notice_date?: string
          sent_at?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_notices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_notices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_invitation_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          employment_id: string | null
          event_type: string
          id: string
          invitation_id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          employment_id?: string | null
          event_type: string
          id?: string
          invitation_id: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          employment_id?: string | null
          event_type?: string
          id?: string
          invitation_id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_invitation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_invitation_events_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_invitation_events_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "employment_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_invitation_events_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_invitations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          delivery_method: string
          expires_at: string
          id: string
          max_uses: number | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          status: string
          token: string
          use_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          delivery_method: string
          expires_at: string
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          status?: string
          token: string
          use_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          delivery_method?: string
          expires_at?: string
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          status?: string
          token?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "employment_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employments: {
        Row: {
          annual_leave_days_override: number | null
          annual_leave_days_override_is_manual: boolean
          company_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_first_name: string | null
          display_last_name: string | null
          ended_at: string | null
          id: string
          is_primary: boolean | null
          job_title: string | null
          modified_at: string | null
          permission_overrides: Json
          role: string | null
          started_at: string | null
          user_id: string | null
          weekend_counts_as_leave_override: boolean | null
        }
        Insert: {
          annual_leave_days_override?: number | null
          annual_leave_days_override_is_manual?: boolean
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_first_name?: string | null
          display_last_name?: string | null
          ended_at?: string | null
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          modified_at?: string | null
          permission_overrides?: Json
          role?: string | null
          started_at?: string | null
          user_id?: string | null
          weekend_counts_as_leave_override?: boolean | null
        }
        Update: {
          annual_leave_days_override?: number | null
          annual_leave_days_override_is_manual?: boolean
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_first_name?: string | null
          display_last_name?: string | null
          ended_at?: string | null
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          modified_at?: string | null
          permission_overrides?: Json
          role?: string | null
          started_at?: string | null
          user_id?: string | null
          weekend_counts_as_leave_override?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "employments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_net: number
          company_id: string
          cost_category_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string
          is_calculatory: boolean
          modified_at: string | null
          notes: string
          order_id: string | null
          recurring_interval: string | null
          storage_path: string | null
          title: string
          vat_amount: number
          vat_rate: number
          vendor: string
        }
        Insert: {
          amount_net?: number
          company_id: string
          cost_category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          is_calculatory?: boolean
          modified_at?: string | null
          notes?: string
          order_id?: string | null
          recurring_interval?: string | null
          storage_path?: string | null
          title: string
          vat_amount?: number
          vat_rate?: number
          vendor?: string
        }
        Update: {
          amount_net?: number
          company_id?: string
          cost_category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          is_calculatory?: boolean
          modified_at?: string | null
          notes?: string
          order_id?: string | null
          recurring_interval?: string | null
          storage_path?: string | null
          title?: string
          vat_amount?: number
          vat_rate?: number
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          category: string
          company_id: string | null
          created_at: string
          id: string
          message: string
          modified_at: string | null
          platform: string | null
          status: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          category: string
          company_id?: string | null
          created_at?: string
          id?: string
          message: string
          modified_at?: string | null
          platform?: string | null
          status?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string
          modified_at?: string | null
          platform?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_send_log: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          intent: string
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          intent?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          intent?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_send_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_send_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          acquisition_cost: number
          acquisition_date: string
          asset_number: string
          company_id: string
          cost_category_id: string | null
          created_at: string
          depreciation_method: string
          disposed_at: string | null
          id: string
          modified_at: string | null
          name: string
          notes: string
          salvage_value: number
          useful_life_years: number
        }
        Insert: {
          acquisition_cost?: number
          acquisition_date?: string
          asset_number?: string
          company_id: string
          cost_category_id?: string | null
          created_at?: string
          depreciation_method?: string
          disposed_at?: string | null
          id?: string
          modified_at?: string | null
          name: string
          notes?: string
          salvage_value?: number
          useful_life_years?: number
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string
          asset_number?: string
          company_id?: string
          cost_category_id?: string | null
          created_at?: string
          depreciation_method?: string
          disposed_at?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          notes?: string
          salvage_value?: number
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          incoming_invoice_id: string
          method: string
          note: string
          paid_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          incoming_invoice_id: string
          method?: string
          note?: string
          paid_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          incoming_invoice_id?: string
          method?: string
          note?: string
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoice_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_payments_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoices: {
        Row: {
          company_id: string
          content_hash: string | null
          cost_category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          gross_total: number
          id: string
          invoice_date: string
          invoice_number: string
          modified_at: string | null
          net_total: number
          notes: string
          order_id: string | null
          parsed_payload: Json | null
          source_format: string
          status: string
          storage_path: string | null
          vat_total: number
          vendor_name: string
          vendor_vat_id: string
        }
        Insert: {
          company_id: string
          content_hash?: string | null
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          gross_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          modified_at?: string | null
          net_total?: number
          notes?: string
          order_id?: string | null
          parsed_payload?: Json | null
          source_format?: string
          status?: string
          storage_path?: string | null
          vat_total?: number
          vendor_name?: string
          vendor_vat_id?: string
        }
        Update: {
          company_id?: string
          content_hash?: string | null
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          gross_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          modified_at?: string | null
          net_total?: number
          notes?: string
          order_id?: string | null
          parsed_payload?: Json | null
          source_format?: string
          status?: string
          storage_path?: string | null
          vat_total?: number
          vendor_name?: string
          vendor_vat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoices_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          billing_rate: number
          company_id: string
          cost_rate: number
          created_at: string
          employment_id: string | null
          id: string
          modified_at: string | null
          order_id: string | null
          role_name: string | null
          scope: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          billing_rate?: number
          company_id: string
          cost_rate?: number
          created_at?: string
          employment_id?: string | null
          id?: string
          modified_at?: string | null
          order_id?: string | null
          role_name?: string | null
          scope: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          billing_rate?: number
          company_id?: string
          cost_rate?: number
          created_at?: string
          employment_id?: string | null
          id?: string
          modified_at?: string | null
          order_id?: string | null
          role_name?: string | null
          scope?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_rates_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_rates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          company_id: string
          created_at: string
          id: string
          modified_at: string | null
          order_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          briefing_blocks: Json
          briefing_enabled: boolean
          briefing_time: string
          company_id: string
          created_at: string
          modified_at: string | null
          muted_types: string[]
          quiet_hours_enabled: boolean
          timezone: string
          user_id: string
        }
        Insert: {
          briefing_blocks?: Json
          briefing_enabled?: boolean
          briefing_time?: string
          company_id: string
          created_at?: string
          modified_at?: string | null
          muted_types?: string[]
          quiet_hours_enabled?: boolean
          timezone?: string
          user_id: string
        }
        Update: {
          briefing_blocks?: Json
          briefing_enabled?: boolean
          briefing_time?: string
          company_id?: string
          created_at?: string
          modified_at?: string | null
          muted_types?: string[]
          quiet_hours_enabled?: boolean
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          dedupe_key: string
          id: string
          params: Json
          push_sent_at: string | null
          read_at: string | null
          type: string
          urgency: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dedupe_key: string
          id: string
          params?: Json
          push_sent_at?: string | null
          read_at?: string | null
          type: string
          urgency?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          params?: Json
          push_sent_at?: string | null
          read_at?: string | null
          type?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_document_categories: {
        Row: {
          company_id: string
          created_at: string
          icon: string
          id: string
          is_hidden: boolean
          is_system: boolean
          modified_at: string | null
          name: string
          slug: string | null
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          icon?: string
          id: string
          is_hidden?: boolean
          is_system?: boolean
          modified_at?: string | null
          name: string
          slug?: string | null
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          is_system?: boolean
          modified_at?: string | null
          name?: string
          slug?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_document_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          category_id: string
          company_id: string
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string
          modified_at: string | null
          name: string
          order_id: string
          source: string
          source_ref_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          category_id: string
          company_id: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id: string
          mime_type?: string
          modified_at?: string | null
          name: string
          order_id: string
          source?: string
          source_ref_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          category_id?: string
          company_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string
          modified_at?: string | null
          name?: string
          order_id?: string
          source?: string
          source_ref_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "order_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_images: {
        Row: {
          company_id: string
          created_at: string
          daily_report_id: string | null
          height: number
          id: string
          modified_at: string | null
          order_id: string
          storage_path: string
          taken_at: string
          user_id: string
          width: number
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_report_id?: string | null
          height: number
          id: string
          modified_at?: string | null
          order_id: string
          storage_path: string
          taken_at: string
          user_id: string
          width: number
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_report_id?: string | null
          height?: number
          id?: string
          modified_at?: string | null
          order_id?: string
          storage_path?: string
          taken_at?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_images_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_issue_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          id: string
          issue_id: string
          kind: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name?: string
          id: string
          issue_id: string
          kind?: string
          mime_type?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          issue_id?: string
          kind?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_issue_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_issue_attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "order_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      order_issues: {
        Row: {
          company_id: string
          created_at: string
          daily_report_id: string | null
          description: string
          id: string
          modified_at: string | null
          order_id: string
          severity: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_report_id?: string | null
          description?: string
          id: string
          modified_at?: string | null
          order_id: string
          severity?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_report_id?: string | null
          description?: string
          id?: string
          modified_at?: string | null
          order_id?: string
          severity?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_issues_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_issues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_materials: {
        Row: {
          article_id: string | null
          billed_document_id: string | null
          company_id: string
          created_at: string
          custom_title: string | null
          daily_report_id: string | null
          icon: string | null
          id: string
          is_billable: boolean
          modified_at: string | null
          notes: string
          order_id: string
          quantity: number
          unit: string
          unit_cost: number | null
          unit_price: number | null
          used_at: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          billed_document_id?: string | null
          company_id: string
          created_at?: string
          custom_title?: string | null
          daily_report_id?: string | null
          icon?: string | null
          id: string
          is_billable?: boolean
          modified_at?: string | null
          notes?: string
          order_id: string
          quantity: number
          unit?: string
          unit_cost?: number | null
          unit_price?: number | null
          used_at?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          billed_document_id?: string | null
          company_id?: string
          created_at?: string
          custom_title?: string | null
          daily_report_id?: string | null
          icon?: string | null
          id?: string
          is_billable?: boolean
          modified_at?: string | null
          notes?: string
          order_id?: string
          quantity?: number
          unit?: string
          unit_cost?: number | null
          unit_price?: number | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_materials_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_billed_document_id_fkey"
            columns: ["billed_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          body: string
          company_id: string
          created_at: string
          id: string
          modified_at: string | null
          order_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id: string
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_mode: string
          city: string
          company_id: string
          contract_sum: number | null
          cost_center_id: string | null
          cost_center_label: string
          country: string
          cover_image_path: string | null
          created_at: string
          customer_id: string | null
          customer_label: string
          description: string
          end_date: string | null
          icon: string | null
          id: string
          modified_at: string | null
          name: string
          postal_code: string
          quote_accepted_at: string | null
          start_date: string | null
          status: string
          street_address: string
        }
        Insert: {
          billing_mode?: string
          city?: string
          company_id: string
          contract_sum?: number | null
          cost_center_id?: string | null
          cost_center_label?: string
          country?: string
          cover_image_path?: string | null
          created_at?: string
          customer_id?: string | null
          customer_label?: string
          description?: string
          end_date?: string | null
          icon?: string | null
          id: string
          modified_at?: string | null
          name: string
          postal_code?: string
          quote_accepted_at?: string | null
          start_date?: string | null
          status?: string
          street_address?: string
        }
        Update: {
          billing_mode?: string
          city?: string
          company_id?: string
          contract_sum?: number | null
          cost_center_id?: string | null
          cost_center_label?: string
          country?: string
          cover_image_path?: string | null
          created_at?: string
          customer_id?: string | null
          customer_label?: string
          description?: string
          end_date?: string | null
          icon?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          postal_code?: string
          quote_accepted_at?: string | null
          start_date?: string | null
          status?: string
          street_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          method: string
          note: string
          paid_at: string
          skonto_amount: number
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          method?: string
          note?: string
          paid_at?: string
          skonto_amount?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          method?: string
          note?: string
          paid_at?: string
          skonto_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          modified_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id: string
          modified_at?: string | null
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birthday: string | null
          created_at: string
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          modified_at: string | null
          onboarding_complete: boolean | null
          profile_image_url: string | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          modified_at?: string | null
          onboarding_complete?: boolean | null
          profile_image_url?: string | null
        }
        Update: {
          birthday?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          modified_at?: string | null
          onboarding_complete?: boolean | null
          profile_image_url?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string
          modified_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          modified_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          modified_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_document_templates: {
        Row: {
          anchor_day: number | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          doc_type: string
          footer_text: string
          id: string
          interval_count: number
          interval_unit: string
          intro_text: string
          is_active: boolean
          last_run_date: string | null
          line_template: Json
          modified_at: string | null
          next_run_date: string
          notes: string
          payment_term_days: number | null
          tax_mode: string
          title: string
        }
        Insert: {
          anchor_day?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          doc_type: string
          footer_text?: string
          id?: string
          interval_count?: number
          interval_unit?: string
          intro_text?: string
          is_active?: boolean
          last_run_date?: string | null
          line_template?: Json
          modified_at?: string | null
          next_run_date: string
          notes?: string
          payment_term_days?: number | null
          tax_mode?: string
          title?: string
        }
        Update: {
          anchor_day?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          doc_type?: string
          footer_text?: string
          id?: string
          interval_count?: number
          interval_unit?: string
          intro_text?: string
          is_active?: boolean
          last_run_date?: string | null
          line_template?: Json
          modified_at?: string | null
          next_run_date?: string
          notes?: string
          payment_term_days?: number | null
          tax_mode?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_document_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_document_lines: {
        Row: {
          company_id: string
          created_at: string
          description: string
          discount_percent: number
          document_id: string
          id: string
          kind: string
          labor_share: number
          net_amount: number
          order_id: string | null
          quantity: number
          sort_order: number
          source_id: string | null
          source_type: string | null
          tax_category: string
          tax_rate_percent: number
          title: string
          unit: string
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string
          discount_percent?: number
          document_id: string
          id?: string
          kind: string
          labor_share?: number
          net_amount?: number
          order_id?: string | null
          quantity?: number
          sort_order?: number
          source_id?: string | null
          source_type?: string | null
          tax_category?: string
          tax_rate_percent?: number
          title?: string
          unit?: string
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          discount_percent?: number
          document_id?: string
          id?: string
          kind?: string
          labor_share?: number
          net_amount?: number
          order_id?: string | null
          quantity?: number
          sort_order?: number
          source_id?: string | null
          source_type?: string | null
          tax_category?: string
          tax_rate_percent?: number
          title?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_document_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_documents: {
        Row: {
          buyer_reference: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          document_number: string | null
          due_date: string | null
          footer_text: string
          gross_total: number
          id: string
          intro_text: string
          issue_date: string | null
          issued_at: string | null
          labor_share: number
          material_share: number
          modified_at: string | null
          net_total: number
          notes: string
          parent_document_id: string | null
          payment_term_days: number | null
          service_date: string | null
          skonto_days: number | null
          skonto_percent: number | null
          status: string
          storage_path: string | null
          tax_mode: string
          type: string
          vat_total: number
        }
        Insert: {
          buyer_reference?: string
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          document_number?: string | null
          due_date?: string | null
          footer_text?: string
          gross_total?: number
          id?: string
          intro_text?: string
          issue_date?: string | null
          issued_at?: string | null
          labor_share?: number
          material_share?: number
          modified_at?: string | null
          net_total?: number
          notes?: string
          parent_document_id?: string | null
          payment_term_days?: number | null
          service_date?: string | null
          skonto_days?: number | null
          skonto_percent?: number | null
          status?: string
          storage_path?: string | null
          tax_mode?: string
          type: string
          vat_total?: number
        }
        Update: {
          buyer_reference?: string
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          document_number?: string | null
          due_date?: string | null
          footer_text?: string
          gross_total?: number
          id?: string
          intro_text?: string
          issue_date?: string | null
          issued_at?: string | null
          labor_share?: number
          material_share?: number
          modified_at?: string | null
          net_total?: number
          notes?: string
          parent_document_id?: string | null
          payment_term_days?: number | null
          service_date?: string | null
          skonto_days?: number | null
          skonto_percent?: number | null
          status?: string
          storage_path?: string | null
          tax_mode?: string
          type?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      system_role_templates: {
        Row: {
          default_billing_rate: number
          default_cost_rate: number
          icon: string | null
          id: string
          key: string
          label: string
          permissions: Json
          sort_order: number
        }
        Insert: {
          default_billing_rate?: number
          default_cost_rate?: number
          icon?: string | null
          id?: string
          key: string
          label: string
          permissions: Json
          sort_order?: number
        }
        Update: {
          default_billing_rate?: number
          default_cost_rate?: number
          icon?: string | null
          id?: string
          key?: string
          label?: string
          permissions?: Json
          sort_order?: number
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billed_document_id: string | null
          billing_rate: number | null
          break_minutes: number
          company_id: string
          cost_rate: number | null
          created_at: string
          daily_report_id: string | null
          employment_id: string | null
          ended_at: string | null
          group_id: string | null
          id: string
          is_billable: boolean
          modified_at: string | null
          note: string
          order_id: string
          started_at: string
          user_id: string | null
          work_assignment_id: string | null
        }
        Insert: {
          billed_document_id?: string | null
          billing_rate?: number | null
          break_minutes?: number
          company_id: string
          cost_rate?: number | null
          created_at?: string
          daily_report_id?: string | null
          employment_id?: string | null
          ended_at?: string | null
          group_id?: string | null
          id: string
          is_billable?: boolean
          modified_at?: string | null
          note?: string
          order_id: string
          started_at: string
          user_id?: string | null
          work_assignment_id?: string | null
        }
        Update: {
          billed_document_id?: string | null
          billing_rate?: number | null
          break_minutes?: number
          company_id?: string
          cost_rate?: number | null
          created_at?: string
          daily_report_id?: string | null
          employment_id?: string | null
          ended_at?: string | null
          group_id?: string | null
          id?: string
          is_billable?: boolean
          modified_at?: string | null
          note?: string
          order_id?: string
          started_at?: string
          user_id?: string | null
          work_assignment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_billed_document_id_fkey"
            columns: ["billed_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_work_assignment_id_fkey"
            columns: ["work_assignment_id"]
            isOneToOne: false
            referencedRelation: "work_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_assignment_employees: {
        Row: {
          assignment_id: string
          employment_id: string
        }
        Insert: {
          assignment_id: string
          employment_id: string
        }
        Update: {
          assignment_id?: string
          employment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_assignment_employees_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "work_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_assignment_employees_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_assignments: {
        Row: {
          company_id: string
          created_at: string
          created_by_user_id: string
          ends_at: string
          id: string
          modified_at: string | null
          note: string
          order_id: string
          starts_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_user_id: string
          ends_at: string
          id: string
          modified_at?: string | null
          note?: string
          order_id: string
          starts_at: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_user_id?: string
          ends_at?: string
          id?: string
          modified_at?: string | null
          note?: string
          order_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_assignments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_employment_invitation: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          employment_id: string
          role: string
        }[]
      }
      actor_employment_rank: { Args: { p_company_id: string }; Returns: number }
      actor_employment_role: { Args: { p_company_id: string }; Returns: string }
      actor_is_company_chef: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      actor_is_company_owner: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      approve_absence: {
        Args: { p_absence_id: string }
        Returns: {
          company_id: string
          created_at: string
          decided_at: string
          decided_by_user_id: string
          decision_note: string
          employment_id: string
          end_date: string
          id: string
          modified_at: string
          note: string
          requested_by_user_id: string
          start_date: string
          status: string
          type: string
        }[]
      }
      assert_not_removing_last_chef: {
        Args: {
          p_company_id: string
          p_employment_id: string
          p_new_ended_at: string
          p_new_role: string
          p_old_role: string
        }
        Returns: undefined
      }
      assert_not_removing_last_owner: {
        Args: {
          p_company_id: string
          p_employment_id: string
          p_new_ended_at: string
          p_new_role: string
          p_old_role: string
        }
        Returns: undefined
      }
      build_morning_briefing: {
        Args: { p_company_id: string; p_date: string; p_user_id: string }
        Returns: Json
      }
      can_assign_employment_role: {
        Args: { p_company_id: string; p_new_role: string }
        Returns: boolean
      }
      can_manage_employment_target: {
        Args: { p_company_id: string; p_target_role: string }
        Returns: boolean
      }
      checklist_company_id: {
        Args: { p_checklist_id: string }
        Returns: string
      }
      checklist_is_own_personal: {
        Args: { p_checklist_id: string }
        Returns: boolean
      }
      checklist_order_id: { Args: { p_checklist_id: string }; Returns: string }
      checklist_user_id: { Args: { p_checklist_id: string }; Returns: string }
      count_active_chefs: {
        Args: { p_company_id: string; p_exclude_employment_id?: string }
        Returns: number
      }
      count_active_owners: {
        Args: { p_company_id: string; p_exclude_employment_id?: string }
        Returns: number
      }
      create_absence_for_employment: {
        Args: {
          p_employment_id: string
          p_end_date: string
          p_id: string
          p_note: string
          p_start_date: string
          p_type: string
        }
        Returns: {
          company_id: string
          created_at: string
          decided_at: string
          decided_by_user_id: string
          decision_note: string
          employment_id: string
          end_date: string
          id: string
          modified_at: string
          note: string
          requested_by_user_id: string
          start_date: string
          status: string
          type: string
        }[]
      }
      create_employment_invitation: {
        Args: { p_delivery_method: string; p_role: string }
        Returns: {
          delivery_method: string
          expires_at: string
          id: string
          role: string
          token: string
        }[]
      }
      create_manual_employment: {
        Args: {
          p_contact_email?: string
          p_contact_phone?: string
          p_employment_id?: string
          p_first_name: string
          p_job_title?: string
          p_last_name: string
          p_role: string
        }
        Returns: string
      }
      delete_company_as_chef: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      delete_company_as_owner: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      dispatch_pending_push: { Args: never; Returns: undefined }
      employment_role_rank: {
        Args: { p_company_id: string; p_role: string }
        Returns: number
      }
      enqueue_notifications: {
        Args: {
          p_company_id: string
          p_dedupe_suffix: string
          p_params: Json
          p_type: string
          p_urgency: string
          p_user_ids: string[]
        }
        Returns: number
      }
      finalize_sales_document: {
        Args: { p_document_id: string }
        Returns: {
          buyer_reference: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          document_number: string | null
          due_date: string | null
          footer_text: string
          gross_total: number
          id: string
          intro_text: string
          issue_date: string | null
          issued_at: string | null
          labor_share: number
          material_share: number
          modified_at: string | null
          net_total: number
          notes: string
          parent_document_id: string | null
          payment_term_days: number | null
          service_date: string | null
          skonto_days: number | null
          skonto_percent: number | null
          status: string
          storage_path: string | null
          tax_mode: string
          type: string
          vat_total: number
        }
        SetofOptions: {
          from: "*"
          to: "sales_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_morning_briefings: { Args: never; Returns: undefined }
      generate_scheduled_notifications: { Args: never; Returns: undefined }
      get_user_primary_company_id: { Args: never; Returns: string }
      has_company_permission: {
        Args: { p_company_id: string; p_permission: string }
        Returns: boolean
      }
      is_company_chef: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_company_owner: { Args: { p_company_id: string }; Returns: boolean }
      is_owner_role_name: {
        Args: { p_company_id: string; p_role: string }
        Returns: boolean
      }
      leave_company: { Args: { p_company_id: string }; Returns: undefined }
      log_finance_audit: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_after_data?: Json
          p_before_data?: Json
          p_company_id: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
      log_invitation_event: {
        Args: {
          p_actor_user_id?: string
          p_employment_id?: string
          p_event_type: string
          p_invitation_id: string
          p_metadata?: Json
          p_target_user_id?: string
        }
        Returns: undefined
      }
      my_morning_briefing: {
        Args: { p_company_id: string; p_date?: string }
        Returns: Json
      }
      notification_recipients: {
        Args: {
          p_company_id: string
          p_exclude_user_id?: string
          p_permission: string
        }
        Returns: string[]
      }
      notification_user_has_permission: {
        Args: { p_company_id: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      recurrence_covers_date: {
        Args: { p_date: string; p_rule: string; p_series_start: string }
        Returns: boolean
      }
      resolve_labor_rate: {
        Args: {
          p_company_id: string
          p_employment_id: string
          p_on_date: string
          p_order_id: string
          p_role_name: string
        }
        Returns: {
          billing_rate: number
          cost_rate: number
        }[]
      }
      revoke_employment_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      seed_company_labor_rate: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      seed_cost_categories_for_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      seed_document_number_sequences: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      seed_labor_rate_for_role: {
        Args: { p_company_id: string; p_role_name: string }
        Returns: undefined
      }
      seed_order_document_categories: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      send_company_notification: {
        Args: {
          p_body: string
          p_broadcast_id: string
          p_company_id: string
          p_employment_ids: string[]
          p_is_important: boolean
          p_subject: string
        }
        Returns: number
      }
      set_company_labor_rate: {
        Args: { p_billing: number; p_company_id: string; p_cost: number }
        Returns: undefined
      }
      set_document_number_start: {
        Args: {
          p_company_id: string
          p_doc_type: string
          p_next: number
          p_prefix: string
        }
        Returns: undefined
      }
      set_role_labor_rate: {
        Args: {
          p_billing: number
          p_company_id: string
          p_cost: number
          p_role_name: string
        }
        Returns: undefined
      }
      shares_company_with: {
        Args: { p_other_user_id: string }
        Returns: boolean
      }
      switch_primary_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      update_document_payment_status: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      user_is_assigned_to_work_assignment: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      work_assignment_company_id: {
        Args: { p_assignment_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
