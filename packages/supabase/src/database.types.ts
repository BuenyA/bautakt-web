/**
 * GENERIERT — nicht von Hand bearbeiten.
 *
 * Quelle:  Supabase-Projekt "Bautakt" (bxivzvmlcnaxqlytumvz, eu-central-1)
 * Stand:   2026-11-07
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
    PostgrestVersion: "14.1"
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
          requested_by_user_id: string | null
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
          requested_by_user_id?: string | null
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
          requested_by_user_id?: string | null
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
          supplier_id: string | null
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
          supplier_id?: string | null
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
          supplier_id?: string | null
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
          {
            foreignKeyName: "articles_supplier_fkey"
            columns: ["supplier_id", "company_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["contact_id", "company_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          contract_end_date: string | null
          country: string | null
          created_at: string
          creator_id: string | null
          currency: string
          delete_after: string | null
          email: string | null
          export_deadline: string | null
          first_dunning_days_after_due: number | null
          iban: string | null
          id: string
          invoice_accent_color: string
          invoice_footer_text: string
          invoice_intro_text: string
          invoice_prefix: string | null
          is_small_business: boolean | null
          last_full_export_at: string | null
          last_full_export_hash: string | null
          legal_form: string | null
          lifecycle_status: string
          logo_image_url: string | null
          logo_url: string | null
          managing_directors: string[]
          modified_at: string | null
          name: string | null
          next_invoice_number: number
          payment_term_days: number
          phone_number: string | null
          postal_code: string | null
          register_court: string | null
          registered_office: string | null
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
          contract_end_date?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          delete_after?: string | null
          email?: string | null
          export_deadline?: string | null
          first_dunning_days_after_due?: number | null
          iban?: string | null
          id?: string
          invoice_accent_color?: string
          invoice_footer_text?: string
          invoice_intro_text?: string
          invoice_prefix?: string | null
          is_small_business?: boolean | null
          last_full_export_at?: string | null
          last_full_export_hash?: string | null
          legal_form?: string | null
          lifecycle_status?: string
          logo_image_url?: string | null
          logo_url?: string | null
          managing_directors?: string[]
          modified_at?: string | null
          name?: string | null
          next_invoice_number?: number
          payment_term_days?: number
          phone_number?: string | null
          postal_code?: string | null
          register_court?: string | null
          registered_office?: string | null
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
          contract_end_date?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          delete_after?: string | null
          email?: string | null
          export_deadline?: string | null
          first_dunning_days_after_due?: number | null
          iban?: string | null
          id?: string
          invoice_accent_color?: string
          invoice_footer_text?: string
          invoice_intro_text?: string
          invoice_prefix?: string | null
          is_small_business?: boolean | null
          last_full_export_at?: string | null
          last_full_export_hash?: string | null
          legal_form?: string | null
          lifecycle_status?: string
          logo_image_url?: string | null
          logo_url?: string | null
          managing_directors?: string[]
          modified_at?: string | null
          name?: string | null
          next_invoice_number?: number
          payment_term_days?: number
          phone_number?: string | null
          postal_code?: string | null
          register_court?: string | null
          registered_office?: string | null
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
      company_datev_settings: {
        Row: {
          account_length: number
          cash_discount_booking: string
          chart_of_accounts: string
          client_number: number | null
          company_id: string
          consultant_number: number | null
          created_at: string
          fiscal_year_start_month: number
          modified_at: string | null
          modified_by: string | null
        }
        Insert: {
          account_length?: number
          cash_discount_booking?: string
          chart_of_accounts?: string
          client_number?: number | null
          company_id: string
          consultant_number?: number | null
          created_at?: string
          fiscal_year_start_month?: number
          modified_at?: string | null
          modified_by?: string | null
        }
        Update: {
          account_length?: number
          cash_discount_booking?: string
          chart_of_accounts?: string
          client_number?: number | null
          company_id?: string
          consultant_number?: number | null
          created_at?: string
          fiscal_year_start_month?: number
          modified_at?: string | null
          modified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_datev_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_datev_settings_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_deletion_log: {
        Row: {
          actor_user_id: string | null
          company_id: string
          details: Json
          event: string
          from_status: string | null
          id: number
          occurred_at: string
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          company_id: string
          details?: Json
          event: string
          from_status?: string | null
          id?: never
          occurred_at?: string
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          company_id?: string
          details?: Json
          event?: string
          from_status?: string | null
          id?: never
          occurred_at?: string
          to_status?: string | null
        }
        Relationships: []
      }
      company_export_log: {
        Row: {
          attempts: number
          company_id: string
          completed_at: string | null
          error: string | null
          failures: number
          file_count: number | null
          files_deleted_at: string | null
          files_valid_until: string | null
          id: string
          locked_until: string | null
          manifest_path: string | null
          manifest_sha256: string | null
          requested_at: string
          requested_by: string | null
          row_count: number | null
          scope: string
          status: string
          total_bytes: number | null
        }
        Insert: {
          attempts?: number
          company_id: string
          completed_at?: string | null
          error?: string | null
          failures?: number
          file_count?: number | null
          files_deleted_at?: string | null
          files_valid_until?: string | null
          id?: string
          locked_until?: string | null
          manifest_path?: string | null
          manifest_sha256?: string | null
          requested_at?: string
          requested_by?: string | null
          row_count?: number | null
          scope?: string
          status?: string
          total_bytes?: number | null
        }
        Update: {
          attempts?: number
          company_id?: string
          completed_at?: string | null
          error?: string | null
          failures?: number
          file_count?: number | null
          files_deleted_at?: string | null
          files_valid_until?: string | null
          id?: string
          locked_until?: string | null
          manifest_path?: string | null
          manifest_sha256?: string | null
          requested_at?: string
          requested_by?: string | null
          row_count?: number | null
          scope?: string
          status?: string
          total_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_export_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_export_log_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_export_parts: {
        Row: {
          bytes: number | null
          company_id: string
          done_at: string | null
          export_id: string
          id: string
          items: Json
          kind: string
          part_no: number
          sha256: string | null
          status: string
          storage_path: string | null
        }
        Insert: {
          bytes?: number | null
          company_id: string
          done_at?: string | null
          export_id: string
          id?: string
          items?: Json
          kind: string
          part_no: number
          sha256?: string | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          bytes?: number | null
          company_id?: string
          done_at?: string | null
          export_id?: string
          id?: string
          items?: Json
          kind?: string
          part_no?: number
          sha256?: string | null
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_export_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_export_parts_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "company_export_log"
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
      company_mail_settings: {
        Row: {
          company_id: string
          created_at: string
          custom_domain: string | null
          custom_sender_email: string | null
          dkim_verified_at: string | null
          dmarc_verified_at: string | null
          domain_checked_at: string | null
          domain_status: string
          inbound_forwarding_address: string | null
          inbound_sender_allowlist: string[]
          inbound_sender_limit_per_day: number
          inbound_slug: string | null
          mail_mode: string
          mail_provider: string
          modified_at: string
          modified_by: string | null
          provider_project_id: string | null
          provider_token_secret_id: string | null
          reply_to_email: string | null
          send_limit_per_day: number
          send_limit_per_hour: number
          sender_mode: string
          spf_verified_at: string | null
          test_recipient_allowlist: string[]
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_domain?: string | null
          custom_sender_email?: string | null
          dkim_verified_at?: string | null
          dmarc_verified_at?: string | null
          domain_checked_at?: string | null
          domain_status?: string
          inbound_forwarding_address?: string | null
          inbound_sender_allowlist?: string[]
          inbound_sender_limit_per_day?: number
          inbound_slug?: string | null
          mail_mode?: string
          mail_provider?: string
          modified_at?: string
          modified_by?: string | null
          provider_project_id?: string | null
          provider_token_secret_id?: string | null
          reply_to_email?: string | null
          send_limit_per_day?: number
          send_limit_per_hour?: number
          sender_mode?: string
          spf_verified_at?: string | null
          test_recipient_allowlist?: string[]
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_domain?: string | null
          custom_sender_email?: string | null
          dkim_verified_at?: string | null
          dmarc_verified_at?: string | null
          domain_checked_at?: string | null
          domain_status?: string
          inbound_forwarding_address?: string | null
          inbound_sender_allowlist?: string[]
          inbound_sender_limit_per_day?: number
          inbound_slug?: string | null
          mail_mode?: string
          mail_provider?: string
          modified_at?: string
          modified_by?: string | null
          provider_project_id?: string | null
          provider_token_secret_id?: string | null
          reply_to_email?: string | null
          send_limit_per_day?: number
          send_limit_per_hour?: number
          sender_mode?: string
          spf_verified_at?: string | null
          test_recipient_allowlist?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "company_mail_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_mail_settings_log: {
        Row: {
          changed_at: string
          changed_by: string
          company_id: string
          id: string
          new_allowlist: string[]
          new_inbound_sender_allowlist: string[]
          new_mail_mode: string
          old_allowlist: string[]
          old_inbound_sender_allowlist: string[]
          old_mail_mode: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          company_id: string
          id?: string
          new_allowlist: string[]
          new_inbound_sender_allowlist?: string[]
          new_mail_mode: string
          old_allowlist: string[]
          old_inbound_sender_allowlist?: string[]
          old_mail_mode: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          company_id?: string
          id?: string
          new_allowlist?: string[]
          new_inbound_sender_allowlist?: string[]
          new_mail_mode?: string
          old_allowlist?: string[]
          old_inbound_sender_allowlist?: string[]
          old_mail_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_mail_settings_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_mail_templates: {
        Row: {
          body: string
          company_id: string
          modified_at: string
          modified_by: string | null
          purpose: string
          subject: string
        }
        Insert: {
          body: string
          company_id: string
          modified_at?: string
          modified_by?: string | null
          purpose: string
          subject: string
        }
        Update: {
          body?: string
          company_id?: string
          modified_at?: string
          modified_by?: string | null
          purpose?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_mail_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
      contact_bank_accounts: {
        Row: {
          account_holder: string
          bank_name: string
          bic: string
          company_id: string
          contact_id: string
          created_at: string
          iban: string
          id: string
          is_default: boolean
          modified_at: string | null
          modified_by: string | null
        }
        Insert: {
          account_holder?: string
          bank_name?: string
          bic?: string
          company_id: string
          contact_id: string
          created_at?: string
          iban: string
          id: string
          is_default?: boolean
          modified_at?: string | null
          modified_by?: string | null
        }
        Update: {
          account_holder?: string
          bank_name?: string
          bic?: string
          company_id?: string
          contact_id?: string
          created_at?: string
          iban?: string
          id?: string
          is_default?: boolean
          modified_at?: string | null
          modified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_bank_accounts_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "contact_bank_accounts_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_number_sequences: {
        Row: {
          company_id: string
          kind: string
          next_number: number
        }
        Insert: {
          company_id: string
          kind: string
          next_number: number
        }
        Update: {
          company_id?: string
          kind?: string
          next_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_number_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_persons: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          mobile: string
          modified_at: string | null
          notes: string
          phone: string
          position: string
          salutation: string
          sort_order: number
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          email?: string
          first_name?: string
          id: string
          is_primary?: boolean
          last_name?: string
          mobile?: string
          modified_at?: string | null
          notes?: string
          phone?: string
          position?: string
          salutation?: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          mobile?: string
          modified_at?: string | null
          notes?: string
          phone?: string
          position?: string
          salutation?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_persons_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          city: string
          company_id: string
          company_name: string
          country: string
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          kind: string
          last_name: string
          mobile: string
          modified_at: string | null
          notes: string
          phone: string
          postal_code: string
          salutation: string
          street_address: string
          tax_number: string
          vat_id: string
          website: string
        }
        Insert: {
          archived_at?: string | null
          city?: string
          company_id: string
          company_name?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id: string
          kind?: string
          last_name?: string
          mobile?: string
          modified_at?: string | null
          notes?: string
          phone?: string
          postal_code?: string
          salutation?: string
          street_address?: string
          tax_number?: string
          vat_id?: string
          website?: string
        }
        Update: {
          archived_at?: string | null
          city?: string
          company_id?: string
          company_name?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          kind?: string
          last_name?: string
          mobile?: string
          modified_at?: string | null
          notes?: string
          phone?: string
          postal_code?: string
          salutation?: string
          street_address?: string
          tax_number?: string
          vat_id?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      customer_profiles: {
        Row: {
          archived_at: string | null
          billing_city: string
          billing_country: string
          billing_postal_code: string
          billing_street: string
          buyer_reference: string
          company_id: string
          contact_id: string
          created_at: string
          customer_number: string
          discount_days: number | null
          discount_percent: number | null
          is_construction_business: boolean
          modified_at: string | null
          payment_term_days: number | null
          tax_exemption_valid_until: string | null
        }
        Insert: {
          archived_at?: string | null
          billing_city?: string
          billing_country?: string
          billing_postal_code?: string
          billing_street?: string
          buyer_reference?: string
          company_id: string
          contact_id: string
          created_at?: string
          customer_number?: string
          discount_days?: number | null
          discount_percent?: number | null
          is_construction_business?: boolean
          modified_at?: string | null
          payment_term_days?: number | null
          tax_exemption_valid_until?: string | null
        }
        Update: {
          archived_at?: string | null
          billing_city?: string
          billing_country?: string
          billing_postal_code?: string
          billing_street?: string
          buyer_reference?: string
          company_id?: string
          contact_id?: string
          created_at?: string
          customer_number?: string
          discount_days?: number | null
          discount_percent?: number | null
          is_construction_business?: boolean
          modified_at?: string | null
          payment_term_days?: number | null
          tax_exemption_valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      datev_account_mappings: {
        Row: {
          account: string
          chart_of_accounts: string
          company_id: string
          created_at: string
          id: string
          modified_at: string | null
          modified_by: string | null
          purpose: string
          tax_key: string
          tax_mode: string
          tax_rate: number | null
        }
        Insert: {
          account: string
          chart_of_accounts: string
          company_id: string
          created_at?: string
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          purpose: string
          tax_key?: string
          tax_mode?: string
          tax_rate?: number | null
        }
        Update: {
          account?: string
          chart_of_accounts?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          purpose?: string
          tax_key?: string
          tax_mode?: string
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "datev_account_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datev_account_mappings_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      datev_default_accounts: {
        Row: {
          account: string
          chart_of_accounts: string
          id: string
          label: string
          purpose: string
          tax_key: string
          tax_mode: string
          tax_rate: number | null
        }
        Insert: {
          account: string
          chart_of_accounts: string
          id?: string
          label: string
          purpose: string
          tax_key?: string
          tax_mode?: string
          tax_rate?: number | null
        }
        Update: {
          account?: string
          chart_of_accounts?: string
          id?: string
          label?: string
          purpose?: string
          tax_key?: string
          tax_mode?: string
          tax_rate?: number | null
        }
        Relationships: []
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      exemption_certificates: {
        Row: {
          certificate_number: string
          company_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          modified_at: string | null
          storage_path: string | null
          tax_office: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          certificate_number?: string
          company_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          id: string
          modified_at?: string | null
          storage_path?: string | null
          tax_office?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          certificate_number?: string
          company_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modified_at?: string | null
          storage_path?: string | null
          tax_office?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "exemption_certificates_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
          {
            foreignKeyName: "exemption_certificates_created_by_fkey"
            columns: ["created_by"]
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
          supplier_id: string | null
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
          supplier_id?: string | null
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
          supplier_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_fkey"
            columns: ["supplier_id", "company_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["contact_id", "company_id"]
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
      inbound_mail_admissions: {
        Row: {
          admitted_at: string
          company_id: string
          dedup_key: string
          sender_key: string
        }
        Insert: {
          admitted_at?: string
          company_id: string
          dedup_key: string
          sender_key: string
        }
        Update: {
          admitted_at?: string
          company_id?: string
          dedup_key?: string
          sender_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_mail_admissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_mail_files: {
        Row: {
          company_id: string
          content_hash: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          file_name: string
          id: string
          inbound_mail_id: string
          invoice_id: string | null
          size_bytes: number
          status: string
          storage_path: string
        }
        Insert: {
          company_id: string
          content_hash: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          file_name: string
          id: string
          inbound_mail_id: string
          invoice_id?: string | null
          size_bytes: number
          status?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          content_hash?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          file_name?: string
          id?: string
          inbound_mail_id?: string
          invoice_id?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_mail_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_mail_files_inbound_mail_id_fkey"
            columns: ["inbound_mail_id"]
            isOneToOne: false
            referencedRelation: "inbound_mails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_mail_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "inbound_mail_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "inbound_mail_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_mail_rejections: {
        Row: {
          company_id: string
          created_at: string
          dedup_key: string
          from_email: string | null
          from_name: string | null
          id: string
          provider_message_id: string
          reason: string
          received_at: string
          subject: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          dedup_key: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider_message_id: string
          reason: string
          received_at: string
          subject?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          dedup_key?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider_message_id?: string
          reason?: string
          received_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_mail_rejections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_mails: {
        Row: {
          attachments: Json
          company_id: string
          created_at: string
          dedup_key: string
          dkim_result: string | null
          dmarc_result: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_spam: boolean
          provider_message_id: string
          raw_sha256: string
          raw_size_bytes: number
          raw_storage_path: string
          received_at: string
          recipient: string
          spam_score: number | null
          spf_result: string | null
          subject: string | null
        }
        Insert: {
          attachments?: Json
          company_id: string
          created_at?: string
          dedup_key: string
          dkim_result?: string | null
          dmarc_result?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_spam?: boolean
          provider_message_id: string
          raw_sha256: string
          raw_size_bytes: number
          raw_storage_path: string
          received_at: string
          recipient: string
          spam_score?: number | null
          spf_result?: string | null
          subject?: string | null
        }
        Update: {
          attachments?: Json
          company_id?: string
          created_at?: string
          dedup_key?: string
          dkim_result?: string | null
          dmarc_result?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_spam?: boolean
          provider_message_id?: string
          raw_sha256?: string
          raw_size_bytes?: number
          raw_storage_path?: string
          received_at?: string
          recipient?: string
          spam_score?: number | null
          spf_result?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_mails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_adjustments: {
        Row: {
          actor_id: string | null
          actor_name: string
          agreed_on: string | null
          agreed_with: string | null
          amount: number
          company_id: string
          created_at: string
          details: Json
          discount_until: string | null
          id: string
          invoice_id: string
          kind: string
          percent: number | null
          reason: string
          reverses_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          agreed_on?: string | null
          agreed_with?: string | null
          amount: number
          company_id: string
          created_at?: string
          details?: Json
          discount_until?: string | null
          id?: string
          invoice_id: string
          kind: string
          percent?: number | null
          reason: string
          reverses_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          agreed_on?: string | null
          agreed_with?: string | null
          amount?: number
          company_id?: string
          created_at?: string
          details?: Json
          discount_until?: string | null
          id?: string
          invoice_id?: string
          kind?: string
          percent?: number | null
          reason?: string
          reverses_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoice_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_adjustments_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          company_id: string
          created_at: string
          field: string | null
          id: string
          invoice_id: string
          mail_reference: string | null
          new_value: string | null
          old_value: string | null
          reason: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          company_id: string
          created_at?: string
          field?: string | null
          id?: string
          invoice_id: string
          mail_reference?: string | null
          new_value?: string | null
          old_value?: string | null
          reason?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          company_id?: string
          created_at?: string
          field?: string | null
          id?: string
          invoice_id?: string
          mail_reference?: string | null
          new_value?: string | null
          old_value?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoice_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_payments: {
        Row: {
          actor_id: string | null
          actor_name: string
          amount: number
          company_id: string
          created_at: string
          id: string
          incoming_invoice_id: string
          method: string
          note: string
          paid_at: string
          reason: string
          reverses_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          incoming_invoice_id: string
          method?: string
          note?: string
          paid_at?: string
          reason?: string
          reverses_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          incoming_invoice_id?: string
          method?: string
          note?: string
          paid_at?: string
          reason?: string
          reverses_id?: string | null
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
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_payments_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_payments_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_payments_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_tax_lines: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          net_amount: number
          tax_mode: string
          tax_rate_percent: number
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          net_amount: number
          tax_mode: string
          tax_rate_percent: number
          vat_amount: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          net_amount?: number
          tax_mode?: string
          tax_rate_percent?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoice_tax_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoice_tax_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_tax_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "incoming_invoice_tax_lines_invoice_id_fkey"
            columns: ["invoice_id"]
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
          review_status: string
          source_format: string
          source_inbound_mail_id: string | null
          status: string
          storage_path: string | null
          supplier_id: string | null
          vat_total: number
          vendor_iban: string
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
          review_status?: string
          source_format?: string
          source_inbound_mail_id?: string | null
          status?: string
          storage_path?: string | null
          supplier_id?: string | null
          vat_total?: number
          vendor_iban?: string
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
          review_status?: string
          source_format?: string
          source_inbound_mail_id?: string | null
          status?: string
          storage_path?: string | null
          supplier_id?: string | null
          vat_total?: number
          vendor_iban?: string
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "incoming_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoices_source_inbound_mail_id_fkey"
            columns: ["source_inbound_mail_id"]
            isOneToOne: false
            referencedRelation: "inbound_mails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_invoices_supplier_fkey"
            columns: ["supplier_id", "company_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          layout: string
          modified_at: string | null
          name: string
          settings: Json
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          layout?: string
          modified_at?: string | null
          name: string
          settings?: Json
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          layout?: string
          modified_at?: string | null
          name?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      mail_message_events: {
        Row: {
          company_id: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          kind: string
          mail_id: string
          message_id: string | null
          occurred_at: string | null
          payload: Json | null
          provider_event_id: string | null
          provider_message_id: string | null
          recipient: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          kind: string
          mail_id: string
          message_id?: string | null
          occurred_at?: string | null
          payload?: Json | null
          provider_event_id?: string | null
          provider_message_id?: string | null
          recipient?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          kind?: string
          mail_id?: string
          message_id?: string | null
          occurred_at?: string | null
          payload?: Json | null
          provider_event_id?: string | null
          provider_message_id?: string | null
          recipient?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_events_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "mail_delivery_status"
            referencedColumns: ["mail_id"]
          },
          {
            foreignKeyName: "mail_message_events_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_messages: {
        Row: {
          attachments: Json
          company_id: string
          created_at: string
          created_by: string
          from_email: string
          from_name: string
          html: string
          id: string
          idempotency_key: string
          incoming_invoice_id: string | null
          mail_provider: string
          mode: string
          provider_project_id: string | null
          purpose: string
          quote_version_id: string | null
          reply_to: string | null
          request_sha256: string
          sales_document_id: string | null
          subject: string
          to_addresses: string[]
        }
        Insert: {
          attachments?: Json
          company_id: string
          created_at?: string
          created_by: string
          from_email: string
          from_name: string
          html: string
          id?: string
          idempotency_key: string
          incoming_invoice_id?: string | null
          mail_provider: string
          mode: string
          provider_project_id?: string | null
          purpose: string
          quote_version_id?: string | null
          reply_to?: string | null
          request_sha256: string
          sales_document_id?: string | null
          subject: string
          to_addresses: string[]
        }
        Update: {
          attachments?: Json
          company_id?: string
          created_at?: string
          created_by?: string
          from_email?: string
          from_name?: string
          html?: string
          id?: string
          idempotency_key?: string
          incoming_invoice_id?: string | null
          mail_provider?: string
          mode?: string
          provider_project_id?: string | null
          purpose?: string
          quote_version_id?: string | null
          reply_to?: string | null
          request_sha256?: string
          sales_document_id?: string | null
          subject?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["draft_version_id"]
          },
          {
            foreignKeyName: "mail_messages_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_sales_document_id_fkey"
            columns: ["sales_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_platform_settings: {
        Row: {
          id: boolean
          mode_cap: string
          modified_at: string
        }
        Insert: {
          id?: boolean
          mode_cap?: string
          modified_at?: string
        }
        Update: {
          id?: boolean
          mode_cap?: string
          modified_at?: string
        }
        Relationships: []
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
          user_id: string | null
        }
        Insert: {
          body?: string
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string | null
          title?: string
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      order_contacts: {
        Row: {
          company_id: string
          contact_id: string
          contact_person_id: string | null
          created_at: string
          id: string
          modified_at: string | null
          note: string
          order_id: string
          role: string
          sort_order: number
        }
        Insert: {
          company_id: string
          contact_id: string
          contact_person_id?: string | null
          created_at?: string
          id: string
          modified_at?: string | null
          note?: string
          order_id: string
          role: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          contact_id?: string
          contact_person_id?: string | null
          created_at?: string
          id?: string
          modified_at?: string | null
          note?: string
          order_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_contacts_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "order_contacts_contact_person_id_contact_id_fkey"
            columns: ["contact_person_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id", "contact_id"]
          },
          {
            foreignKeyName: "order_contacts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_contacts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          user_id: string | null
        }
        Insert: {
          body?: string
          company_id: string
          created_at?: string
          id: string
          modified_at?: string | null
          order_id: string
          title?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          modified_at?: string | null
          order_id?: string
          title?: string
          user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      order_quote_totals: {
        Row: {
          addendum_count: number
          addendum_net_total: number
          company_id: string
          main_billing_mode: string | null
          main_net_total: number | null
          main_quote_id: string | null
          order_id: string
          updated_at: string
        }
        Insert: {
          addendum_count?: number
          addendum_net_total?: number
          company_id: string
          main_billing_mode?: string | null
          main_net_total?: number | null
          main_quote_id?: string | null
          order_id: string
          updated_at?: string
        }
        Update: {
          addendum_count?: number
          addendum_net_total?: number
          company_id?: string
          main_billing_mode?: string | null
          main_net_total?: number | null
          main_quote_id?: string | null
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_quote_totals_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id", "company_id"]
          },
          {
            foreignKeyName: "order_quote_totals_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "company_id"]
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
            foreignKeyName: "orders_customer_fkey"
            columns: ["customer_id", "company_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
        ]
      }
      other_profiles: {
        Row: {
          archived_at: string | null
          company_id: string
          contact_id: string
          created_at: string
          function: string
          modified_at: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          function?: string
          modified_at?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          function?: string
          modified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "other_profiles_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
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
      quote_acceptance_items: {
        Row: {
          company_id: string
          created_at: string
          item_id: string
          quote_id: string
          version_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          item_id: string
          quote_id: string
          version_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          item_id?: string
          quote_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_acceptance_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptance_items_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_acceptance_items_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_acceptance_items_version_fkey"
            columns: ["version_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id", "quote_id"]
          },
        ]
      }
      quote_attachments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number
          id: string
          kind: string
          mime_type: string
          quote_id: string
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number
          id?: string
          kind?: string
          mime_type?: string
          quote_id: string
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number
          id?: string
          kind?: string
          mime_type?: string
          quote_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_attachments_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_attachments_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      quote_confirmations: {
        Row: {
          acceptance_event_id: string
          accepted_on: string | null
          company_id: string
          confirmation_date: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          document_number: string
          id: string
          quote_id: string
          selected_item_ids: string[]
          storage_path: string | null
          version_id: string
        }
        Insert: {
          acceptance_event_id: string
          accepted_on?: string | null
          company_id: string
          confirmation_date: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_number: string
          id?: string
          quote_id: string
          selected_item_ids?: string[]
          storage_path?: string | null
          version_id: string
        }
        Update: {
          acceptance_event_id?: string
          accepted_on?: string | null
          company_id?: string
          confirmation_date?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_number?: string
          id?: string
          quote_id?: string
          selected_item_ids?: string[]
          storage_path?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_confirmations_acceptance_event_id_fkey"
            columns: ["acceptance_event_id"]
            isOneToOne: true
            referencedRelation: "quote_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_confirmations_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_confirmations_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_confirmations_version_fkey"
            columns: ["version_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id", "quote_id"]
          },
        ]
      }
      quote_events: {
        Row: {
          company_id: string
          created_by: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          quote_id: string
          version_id: string | null
        }
        Insert: {
          company_id: string
          created_by?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          quote_id: string
          version_id?: string | null
        }
        Update: {
          company_id?: string
          created_by?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          quote_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_events_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_events_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      quote_items: {
        Row: {
          alternative_to_id: string | null
          company_id: string
          contingency_mode: string | null
          copied_from_item_id: string | null
          id: string
          labor_share: number
          long_text: string
          node_type: string
          origin: string
          origin_ref_id: string | null
          oz: string
          parent_id: string | null
          position_type: string | null
          price_is_manual: boolean
          quantity: number
          short_text: string
          sort_order: number
          tax_category: string
          tax_rate_percent: number
          unit: string
          unit_price: number
          version_id: string
        }
        Insert: {
          alternative_to_id?: string | null
          company_id: string
          contingency_mode?: string | null
          copied_from_item_id?: string | null
          id?: string
          labor_share?: number
          long_text?: string
          node_type: string
          origin?: string
          origin_ref_id?: string | null
          oz?: string
          parent_id?: string | null
          position_type?: string | null
          price_is_manual?: boolean
          quantity?: number
          short_text?: string
          sort_order?: number
          tax_category?: string
          tax_rate_percent?: number
          unit?: string
          unit_price?: number
          version_id: string
        }
        Update: {
          alternative_to_id?: string | null
          company_id?: string
          contingency_mode?: string | null
          copied_from_item_id?: string | null
          id?: string
          labor_share?: number
          long_text?: string
          node_type?: string
          origin?: string
          origin_ref_id?: string | null
          oz?: string
          parent_id?: string | null
          position_type?: string | null
          price_is_manual?: boolean
          quantity?: number
          short_text?: string
          sort_order?: number
          tax_category?: string
          tax_rate_percent?: number
          unit?: string
          unit_price?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_alternative_fkey"
            columns: ["alternative_to_id", "version_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id", "version_id"]
          },
          {
            foreignKeyName: "quote_items_parent_fkey"
            columns: ["parent_id", "version_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id", "version_id"]
          },
          {
            foreignKeyName: "quote_items_version_fkey"
            columns: ["version_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      quote_outputs: {
        Row: {
          company_id: string
          content_hash: string
          created_at: string
          created_by: string | null
          document_number: string
          id: string
          kind: string
          quote_id: string
          storage_path: string
          version_id: string
        }
        Insert: {
          company_id: string
          content_hash: string
          created_at?: string
          created_by?: string | null
          document_number?: string
          id?: string
          kind: string
          quote_id: string
          storage_path: string
          version_id: string
        }
        Update: {
          company_id?: string
          content_hash?: string
          created_at?: string
          created_by?: string | null
          document_number?: string
          id?: string
          kind?: string
          quote_id?: string
          storage_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_outputs_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_outputs_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_outputs_version_fkey"
            columns: ["version_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id", "quote_id"]
          },
        ]
      }
      quote_platform_settings: {
        Row: {
          consumer_acceptance_enabled: boolean
          id: boolean
          modified_at: string
        }
        Insert: {
          consumer_acceptance_enabled?: boolean
          id?: boolean
          modified_at?: string
        }
        Update: {
          consumer_acceptance_enabled?: boolean
          id?: boolean
          modified_at?: string
        }
        Relationships: []
      }
      quote_versions: {
        Row: {
          billing_mode: string
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_street: string
          buyer_vat_id: string
          calc_mode: string
          closing_text: string
          company_id: string
          content_hash: string | null
          contract_basis: string
          created_at: string
          created_by: string | null
          currency: string
          discount_percent: number
          exec_from: string | null
          exec_to: string | null
          gross_total: number
          id: string
          intro_text: string
          invoice_template_id: string | null
          issued_at: string | null
          issued_by: string | null
          labor_share_total: number
          modified_at: string
          net_total: number
          prelim_text: string
          quote_date: string | null
          quote_id: string
          seller_bank_name: string
          seller_bic: string
          seller_city: string
          seller_country: string
          seller_email: string
          seller_iban: string
          seller_name: string
          seller_phone: string
          seller_postal_code: string
          seller_street: string
          seller_tax_number: string
          seller_trade_register: string
          seller_vat_id: string
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          storage_path: string | null
          subject: string
          tax_mode: string
          valid_until: string | null
          vat_total: number
          version_no: number
        }
        Insert: {
          billing_mode?: string
          buyer_city?: string
          buyer_contact_name?: string
          buyer_country?: string
          buyer_customer_number?: string
          buyer_email?: string
          buyer_name?: string
          buyer_postal_code?: string
          buyer_street?: string
          buyer_vat_id?: string
          calc_mode?: string
          closing_text?: string
          company_id: string
          content_hash?: string | null
          contract_basis?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_percent?: number
          exec_from?: string | null
          exec_to?: string | null
          gross_total?: number
          id?: string
          intro_text?: string
          invoice_template_id?: string | null
          issued_at?: string | null
          issued_by?: string | null
          labor_share_total?: number
          modified_at?: string
          net_total?: number
          prelim_text?: string
          quote_date?: string | null
          quote_id: string
          seller_bank_name?: string
          seller_bic?: string
          seller_city?: string
          seller_country?: string
          seller_email?: string
          seller_iban?: string
          seller_name?: string
          seller_phone?: string
          seller_postal_code?: string
          seller_street?: string
          seller_tax_number?: string
          seller_trade_register?: string
          seller_vat_id?: string
          site_city?: string
          site_country?: string
          site_postal_code?: string
          site_street?: string
          storage_path?: string | null
          subject?: string
          tax_mode?: string
          valid_until?: string | null
          vat_total?: number
          version_no: number
        }
        Update: {
          billing_mode?: string
          buyer_city?: string
          buyer_contact_name?: string
          buyer_country?: string
          buyer_customer_number?: string
          buyer_email?: string
          buyer_name?: string
          buyer_postal_code?: string
          buyer_street?: string
          buyer_vat_id?: string
          calc_mode?: string
          closing_text?: string
          company_id?: string
          content_hash?: string | null
          contract_basis?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_percent?: number
          exec_from?: string | null
          exec_to?: string | null
          gross_total?: number
          id?: string
          intro_text?: string
          invoice_template_id?: string | null
          issued_at?: string | null
          issued_by?: string | null
          labor_share_total?: number
          modified_at?: string
          net_total?: number
          prelim_text?: string
          quote_date?: string | null
          quote_id?: string
          seller_bank_name?: string
          seller_bic?: string
          seller_city?: string
          seller_country?: string
          seller_email?: string
          seller_iban?: string
          seller_name?: string
          seller_phone?: string
          seller_postal_code?: string
          seller_street?: string
          seller_tax_number?: string
          seller_trade_register?: string
          seller_vat_id?: string
          site_city?: string
          site_country?: string
          site_postal_code?: string
          site_street?: string
          storage_path?: string | null
          subject?: string
          tax_mode?: string
          valid_until?: string | null
          vat_total?: number
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quote_overview"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_versions_quote_fkey"
            columns: ["quote_id", "company_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "quote_versions_template_fkey"
            columns: ["invoice_template_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        Insert: {
          accepted_version_id?: string | null
          company_id: string
          contact_person_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_kind?: string | null
          decision_note?: string
          decision_recorded_at?: string | null
          decline_reason?: string
          document_number?: string | null
          follow_up_on?: string | null
          id?: string
          kind?: string
          modified_at?: string
          order_id?: string | null
          origin?: string
          responsible_user_id?: string | null
          site_city?: string
          site_country?: string
          site_postal_code?: string
          site_street?: string
          subject?: string
        }
        Update: {
          accepted_version_id?: string | null
          company_id?: string
          contact_person_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_kind?: string | null
          decision_note?: string
          decision_recorded_at?: string | null
          decline_reason?: string
          document_number?: string | null
          follow_up_on?: string | null
          id?: string
          kind?: string
          modified_at?: string
          order_id?: string | null
          origin?: string
          responsible_user_id?: string | null
          site_city?: string
          site_country?: string
          site_postal_code?: string
          site_street?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_accepted_version_fkey"
            columns: ["accepted_version_id", "id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id", "quote_id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contact_person_id_fkey"
            columns: ["contact_person_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_fkey"
            columns: ["customer_id", "company_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
          {
            foreignKeyName: "quotes_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id", "company_id"]
          },
          {
            foreignKeyName: "quotes_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "company_id"]
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
            foreignKeyName: "recurring_document_templates_customer_fkey"
            columns: ["customer_id", "company_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
        ]
      }
      sales_document_datev_accounts: {
        Row: {
          account_source: string
          company_id: string
          created_at: string
          document_id: string
          id: string
          net_amount: number
          revenue_account: string
          tax_key: string
          tax_mode: string
          tax_rate_percent: number
        }
        Insert: {
          account_source?: string
          company_id: string
          created_at?: string
          document_id: string
          id?: string
          net_amount: number
          revenue_account?: string
          tax_key?: string
          tax_mode: string
          tax_rate_percent: number
        }
        Update: {
          account_source?: string
          company_id?: string
          created_at?: string
          document_id?: string
          id?: string
          net_amount?: number
          revenue_account?: string
          tax_key?: string
          tax_mode?: string
          tax_rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_document_datev_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_datev_accounts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_document_lines: {
        Row: {
          company_id: string
          created_at: string
          credited_document_id: string | null
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
          credited_document_id?: string | null
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
          credited_document_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      sales_document_type_codes: {
        Row: {
          document_type: string
          note: string
          type_code: string
          updated_at: string
        }
        Insert: {
          document_type: string
          note?: string
          type_code: string
          updated_at?: string
        }
        Update: {
          document_type?: string
          note?: string
          type_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_documents: {
        Row: {
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_reference: string
          buyer_street: string
          buyer_vat_id: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          credited_total: number
          currency: string
          customer_id: string | null
          datev_chart_of_accounts: string
          datev_debtor_account: string
          datev_debtor_source: string
          document_number: string | null
          due_date: string | null
          e_invoice: boolean
          einvoice_format: string
          footer_text: string
          gross_total: number
          id: string
          intro_text: string
          invoice_template_id: string | null
          issue_date: string | null
          issued_at: string | null
          labor_share: number
          material_share: number
          modified_at: string | null
          net_total: number
          notes: string
          parent_document_id: string | null
          payment_term_days: number | null
          seller_bank_name: string
          seller_bic: string
          seller_city: string
          seller_country: string
          seller_email: string
          seller_iban: string
          seller_name: string
          seller_phone: string
          seller_postal_code: string
          seller_street: string
          seller_tax_number: string
          seller_trade_register: string
          seller_vat_id: string
          service_date: string | null
          skonto_days: number | null
          skonto_percent: number | null
          status: string
          storage_path: string | null
          subject: string
          tax_mode: string
          type: string
          vat_total: number
        }
        Insert: {
          buyer_city?: string
          buyer_contact_name?: string
          buyer_country?: string
          buyer_customer_number?: string
          buyer_email?: string
          buyer_name?: string
          buyer_postal_code?: string
          buyer_reference?: string
          buyer_street?: string
          buyer_vat_id?: string
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          credited_total?: number
          currency?: string
          customer_id?: string | null
          datev_chart_of_accounts?: string
          datev_debtor_account?: string
          datev_debtor_source?: string
          document_number?: string | null
          due_date?: string | null
          e_invoice?: boolean
          einvoice_format?: string
          footer_text?: string
          gross_total?: number
          id?: string
          intro_text?: string
          invoice_template_id?: string | null
          issue_date?: string | null
          issued_at?: string | null
          labor_share?: number
          material_share?: number
          modified_at?: string | null
          net_total?: number
          notes?: string
          parent_document_id?: string | null
          payment_term_days?: number | null
          seller_bank_name?: string
          seller_bic?: string
          seller_city?: string
          seller_country?: string
          seller_email?: string
          seller_iban?: string
          seller_name?: string
          seller_phone?: string
          seller_postal_code?: string
          seller_street?: string
          seller_tax_number?: string
          seller_trade_register?: string
          seller_vat_id?: string
          service_date?: string | null
          skonto_days?: number | null
          skonto_percent?: number | null
          status?: string
          storage_path?: string | null
          subject?: string
          tax_mode?: string
          type: string
          vat_total?: number
        }
        Update: {
          buyer_city?: string
          buyer_contact_name?: string
          buyer_country?: string
          buyer_customer_number?: string
          buyer_email?: string
          buyer_name?: string
          buyer_postal_code?: string
          buyer_reference?: string
          buyer_street?: string
          buyer_vat_id?: string
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          credited_total?: number
          currency?: string
          customer_id?: string | null
          datev_chart_of_accounts?: string
          datev_debtor_account?: string
          datev_debtor_source?: string
          document_number?: string | null
          due_date?: string | null
          e_invoice?: boolean
          einvoice_format?: string
          footer_text?: string
          gross_total?: number
          id?: string
          intro_text?: string
          invoice_template_id?: string | null
          issue_date?: string | null
          issued_at?: string | null
          labor_share?: number
          material_share?: number
          modified_at?: string | null
          net_total?: number
          notes?: string
          parent_document_id?: string | null
          payment_term_days?: number | null
          seller_bank_name?: string
          seller_bic?: string
          seller_city?: string
          seller_country?: string
          seller_email?: string
          seller_iban?: string
          seller_name?: string
          seller_phone?: string
          seller_postal_code?: string
          seller_street?: string
          seller_tax_number?: string
          seller_trade_register?: string
          seller_vat_id?: string
          service_date?: string | null
          skonto_days?: number | null
          skonto_percent?: number | null
          status?: string
          storage_path?: string | null
          subject?: string
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
            foreignKeyName: "sales_documents_customer_fkey"
            columns: ["customer_id", "company_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
          {
            foreignKeyName: "sales_documents_invoice_template_fk"
            columns: ["invoice_template_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id", "company_id"]
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
      subcontractor_profiles: {
        Row: {
          archived_at: string | null
          company_id: string
          contact_id: string
          created_at: string
          modified_at: string | null
          reverse_charge_13b: boolean
          trade: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          modified_at?: string | null
          reverse_charge_13b?: boolean
          trade?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          modified_at?: string | null
          reverse_charge_13b?: boolean
          trade?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_profiles_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: true
            referencedRelation: "supplier_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          archived_at: string | null
          company_id: string
          contact_id: string
          created_at: string
          default_cost_category_id: string | null
          discount_days: number | null
          discount_percent: number | null
          modified_at: string | null
          our_customer_number: string
          payment_term_days: number | null
          supplier_number: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          default_cost_category_id?: string | null
          discount_days?: number | null
          discount_percent?: number | null
          modified_at?: string | null
          our_customer_number?: string
          payment_term_days?: number | null
          supplier_number?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          default_cost_category_id?: string | null
          discount_days?: number | null
          discount_percent?: number | null
          modified_at?: string | null
          our_customer_number?: string
          payment_term_days?: number | null
          supplier_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "supplier_profiles_default_cost_category_id_fkey"
            columns: ["default_cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
          created_by_user_id: string | null
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
          created_by_user_id?: string | null
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
          created_by_user_id?: string | null
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
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id"]
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
      incoming_duplicate_matches: {
        Row: {
          company_id: string | null
          id: string | null
          kind: string | null
          match: string | null
          other_id: string | null
          other_kind: string | null
          other_label: string | null
        }
        Relationships: []
      }
      incoming_invoice_balances: {
        Row: {
          company_id: string | null
          gross_total: number | null
          invoice_id: string | null
          last_paid_at: string | null
          open_total: number | null
          paid_on: string | null
          paid_total: number | null
          payable_total: number | null
          skonto_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_invoice_payables: {
        Row: {
          company_id: string | null
          discount_until: string | null
          gross_total: number | null
          invoice_id: string | null
          payable_total: number | null
          skonto_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_delivery_status: {
        Row: {
          company_id: string | null
          incoming_invoice_id: string | null
          mail_id: string | null
          problem_code: string | null
          problem_kind: string | null
          problem_message: string | null
          problem_recipient: string | null
          purpose: string | null
          recipients_delivered: number | null
          recipients_total: number | null
          sales_document_id: string | null
          sent_at: string | null
          status: string | null
          status_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoice_payables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "mail_messages_incoming_invoice_id_fkey"
            columns: ["incoming_invoice_id"]
            isOneToOne: false
            referencedRelation: "incoming_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_sales_document_id_fkey"
            columns: ["sales_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      order_contract_totals: {
        Row: {
          addendum_count: number | null
          addendum_net_total: number | null
          billing_mode: string | null
          billing_mode_locked: boolean | null
          company_id: string | null
          contract_net: number | null
          main_net_total: number | null
          main_quote_id: string | null
          manual_net: number | null
          order_id: string | null
          source: string | null
          sum_locked: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_overview: {
        Row: {
          company_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          decided_at: string | null
          decision: string | null
          document_number: string | null
          draft_version_id: string | null
          follow_up_on: string | null
          gross_total: number | null
          has_open_draft: boolean | null
          id: string | null
          issued_at: string | null
          kind: string | null
          modified_at: string | null
          net_total: number | null
          order_id: string | null
          quote_date: string | null
          responsible_user_id: string | null
          status: string | null
          subject: string | null
          valid_until: string | null
          vat_total: number | null
          version_id: string | null
          version_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_fkey"
            columns: ["customer_id", "company_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["contact_id", "company_id"]
          },
          {
            foreignKeyName: "quotes_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "order_contract_totals"
            referencedColumns: ["order_id", "company_id"]
          },
          {
            foreignKeyName: "quotes_order_fkey"
            columns: ["order_id", "company_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
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
      accept_quote: {
        Args: {
          p_decided_at: string
          p_evidence_hash?: string
          p_evidence_path?: string
          p_kind: string
          p_note?: string
          p_order_id?: string
          p_order_mode?: string
          p_selected_item_ids?: string[]
          p_version_id: string
        }
        Returns: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
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
      allocate_document_number: {
        Args: { p_company_id: string; p_doc_type: string }
        Returns: string
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
      cancel_sales_document: {
        Args: { p_document_id: string }
        Returns: {
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_reference: string
          buyer_street: string
          buyer_vat_id: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          credited_total: number
          currency: string
          customer_id: string | null
          datev_chart_of_accounts: string
          datev_debtor_account: string
          datev_debtor_source: string
          document_number: string | null
          due_date: string | null
          e_invoice: boolean
          einvoice_format: string
          footer_text: string
          gross_total: number
          id: string
          intro_text: string
          invoice_template_id: string | null
          issue_date: string | null
          issued_at: string | null
          labor_share: number
          material_share: number
          modified_at: string | null
          net_total: number
          notes: string
          parent_document_id: string | null
          payment_term_days: number | null
          seller_bank_name: string
          seller_bic: string
          seller_city: string
          seller_country: string
          seller_email: string
          seller_iban: string
          seller_name: string
          seller_phone: string
          seller_postal_code: string
          seller_street: string
          seller_tax_number: string
          seller_trade_register: string
          seller_vat_id: string
          service_date: string | null
          skonto_days: number | null
          skonto_percent: number | null
          status: string
          storage_path: string | null
          subject: string
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
      checklist_user_id: { Args: { p_checklist_id: string }; Returns: string }
      company_export_claim: {
        Args: { p_export_id: string; p_seconds?: number }
        Returns: {
          attempts: number
          company_id: string
          completed_at: string | null
          error: string | null
          failures: number
          file_count: number | null
          files_deleted_at: string | null
          files_valid_until: string | null
          id: string
          locked_until: string | null
          manifest_path: string | null
          manifest_sha256: string | null
          requested_at: string
          requested_by: string | null
          row_count: number | null
          scope: string
          status: string
          total_bytes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "company_export_log"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      company_legal_footer_missing: {
        Args: { p_company_id: string }
        Returns: string[]
      }
      company_lifecycle_job_secret_ok: {
        Args: { p_secret: string }
        Returns: boolean
      }
      company_lifecycle_mail_claim: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          company_id: string
          company_name: string
          contract_end_date: string
          delete_after: string
          export_deadline: string
          kind: string
          mail_id: string
          recipients: string[]
        }[]
      }
      company_lifecycle_mail_finish: {
        Args: {
          p_error?: string
          p_mail_id: string
          p_provider_message_id?: string
          p_recipient_count?: number
          p_release?: boolean
          p_retry?: boolean
          p_sent: boolean
        }
        Returns: string
      }
      company_lifecycle_tick: { Args: { p_today?: string }; Returns: Json }
      company_purge_begin: {
        Args: { p_company_id: string; p_today?: string }
        Returns: string
      }
      company_purge_due: { Args: { p_today?: string }; Returns: string[] }
      company_purge_execute: {
        Args: { p_company_id: string; p_today?: string }
        Returns: Json
      }
      company_purge_fail: {
        Args: { p_company_id: string; p_error: string }
        Returns: undefined
      }
      company_purge_files: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          bucket: string
          name: string
        }[]
      }
      company_purge_files_done: {
        Args: { p_company_id: string; p_deleted: number }
        Returns: undefined
      }
      company_purge_finish: {
        Args: {
          p_company_id: string
          p_error?: string
          p_users_deleted: number
          p_users_failed: number
        }
        Returns: string
      }
      company_purge_pending_users: {
        Args: { p_company_id: string }
        Returns: {
          profile_files: string[]
          user_id: string
        }[]
      }
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
      create_quote_version: { Args: { p_quote_id: string }; Returns: string }
      datev_account_fits: {
        Args: { p_account: string; p_account_length: number; p_purpose: string }
        Returns: boolean
      }
      datev_effective_settings: {
        Args: { p_company_id: string }
        Returns: {
          account_length: number
          chart_of_accounts: string
          client_number: number
          consultant_number: number
          fiscal_year_start_month: number
          has_settings: boolean
        }[]
      }
      datev_incoming_export: {
        Args: { p_company_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      datev_incoming_invoice_json: {
        Args: { p_chart: string; p_collective: string; p_invoice_id: string }
        Returns: Json
      }
      datev_resolve_account: {
        Args: {
          p_company_id: string
          p_purpose: string
          p_tax_mode?: string
          p_tax_rate?: number
        }
        Returns: {
          account: string
          source: string
          tax_key: string
        }[]
      }
      datev_resolve_account_internal: {
        Args: {
          p_company_id: string
          p_purpose: string
          p_tax_mode: string
          p_tax_rate: number
        }
        Returns: {
          account: string
          source: string
          tax_key: string
        }[]
      }
      datev_resolve_sales_accounts: {
        Args: { p_document_id: string }
        Returns: {
          chart_of_accounts: string
          debtor_account: string
          debtor_source: string
          net_amount: number
          revenue_account: string
          revenue_account_source: string
          revenue_tax_key: string
          tax_mode: string
          tax_rate_percent: number
          warnings: string[]
        }[]
      }
      datev_sales_export: {
        Args: { p_company_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      decline_quote: {
        Args: {
          p_decided_at: string
          p_kind: string
          p_note?: string
          p_quote_id: string
          p_reason?: string
        }
        Returns: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_quote_draft: { Args: { p_quote_id: string }; Returns: undefined }
      derive_incoming_invoice_tax_line: {
        Args: { p_invoice_id: string }
        Returns: boolean
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
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_reference: string
          buyer_street: string
          buyer_vat_id: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          credited_total: number
          currency: string
          customer_id: string | null
          datev_chart_of_accounts: string
          datev_debtor_account: string
          datev_debtor_source: string
          document_number: string | null
          due_date: string | null
          e_invoice: boolean
          einvoice_format: string
          footer_text: string
          gross_total: number
          id: string
          intro_text: string
          invoice_template_id: string | null
          issue_date: string | null
          issued_at: string | null
          labor_share: number
          material_share: number
          modified_at: string | null
          net_total: number
          notes: string
          parent_document_id: string | null
          payment_term_days: number | null
          seller_bank_name: string
          seller_bic: string
          seller_city: string
          seller_country: string
          seller_email: string
          seller_iban: string
          seller_name: string
          seller_phone: string
          seller_postal_code: string
          seller_street: string
          seller_tax_number: string
          seller_trade_register: string
          seller_vat_id: string
          service_date: string | null
          skonto_days: number | null
          skonto_percent: number | null
          status: string
          storage_path: string | null
          subject: string
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
      get_company_mail_settings: {
        Args: { p_company_id: string }
        Returns: {
          effective_mode: string
          mail_mode: string
          mode_cap: string
          test_recipient_allowlist: string[]
        }[]
      }
      get_user_primary_company_id: { Args: never; Returns: string }
      has_company_permission: {
        Args: { p_company_id: string; p_permission: string }
        Returns: boolean
      }
      has_valid_exemption: {
        Args: { p_contact_id: string; p_on: string }
        Returns: boolean
      }
      inbound_mail_admit: {
        Args: { p_company_id: string; p_mail: Json }
        Returns: Json
      }
      inbound_mail_lookup: {
        Args: { p_dedup_key: string; p_slug: string }
        Returns: Json
      }
      inbound_mail_record: {
        Args: {
          p_company_id: string
          p_invoices: Json
          p_mail: Json
          p_review_files?: Json
        }
        Returns: Json
      }
      incoming_invoice_sync_payment_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_company_owner: { Args: { p_company_id: string }; Returns: boolean }
      is_owner_role_name: {
        Args: { p_company_id: string; p_role: string }
        Returns: boolean
      }
      issue_quote_version: {
        Args: {
          p_expected_gross?: number
          p_expected_net?: number
          p_version_id: string
        }
        Returns: {
          billing_mode: string
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_street: string
          buyer_vat_id: string
          calc_mode: string
          closing_text: string
          company_id: string
          content_hash: string | null
          contract_basis: string
          created_at: string
          created_by: string | null
          currency: string
          discount_percent: number
          exec_from: string | null
          exec_to: string | null
          gross_total: number
          id: string
          intro_text: string
          invoice_template_id: string | null
          issued_at: string | null
          issued_by: string | null
          labor_share_total: number
          modified_at: string
          net_total: number
          prelim_text: string
          quote_date: string | null
          quote_id: string
          seller_bank_name: string
          seller_bic: string
          seller_city: string
          seller_country: string
          seller_email: string
          seller_iban: string
          seller_name: string
          seller_phone: string
          seller_postal_code: string
          seller_street: string
          seller_tax_number: string
          seller_trade_register: string
          seller_vat_id: string
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          storage_path: string | null
          subject: string
          tax_mode: string
          valid_until: string | null
          vat_total: number
          version_no: number
        }
        SetofOptions: {
          from: "*"
          to: "quote_versions"
          isOneToOne: true
          isSetofReturn: false
        }
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
      mail_archive_message: {
        Args: {
          p_attachments: Json
          p_company_id: string
          p_created_by: string
          p_from_email: string
          p_from_name: string
          p_html: string
          p_idempotency_key: string
          p_incoming_invoice_id: string
          p_mode: string
          p_purpose: string
          p_quote_version_id?: string
          p_reply_to: string
          p_request_sha256: string
          p_sales_document_id: string
          p_subject: string
          p_to_addresses: string[]
        }
        Returns: {
          mail_id: string
          replayed: boolean
        }[]
      }
      mail_can_read: {
        Args: { p_company_id: string; p_purpose: string }
        Returns: boolean
      }
      mail_delivery_rank: { Args: { p_kind: string }; Returns: number }
      mail_effective_mode: {
        Args: { p_cap: string; p_tenant_mode: string }
        Returns: string
      }
      mail_mode_cap: { Args: never; Returns: string }
      mail_provider_token: { Args: { p_company_id: string }; Returns: string }
      mail_record_delivery_event: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_kind: string
          p_mail_id: string
          p_occurred_at: string
          p_project_id: string
          p_provider_event_id: string
          p_provider_message_id: string
          p_recipient: string
        }
        Returns: string
      }
      mail_record_event: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_kind: string
          p_mail_id: string
          p_message_id: string
          p_payload: Json
          p_provider_message_id: string
        }
        Returns: string
      }
      mail_template_can_write: {
        Args: { p_company_id: string; p_purpose: string }
        Returns: boolean
      }
      merge_contacts: {
        Args: { p_drop: string; p_keep: string }
        Returns: undefined
      }
      my_company_lifecycle: {
        Args: never
        Returns: {
          access: string
          company_id: string
          company_name: string
          contract_end_date: string
          delete_after: string
          export_deadline: string
          is_owner: boolean
          lifecycle_status: string
        }[]
      }
      my_morning_briefing: {
        Args: { p_company_id: string; p_date?: string }
        Returns: Json
      }
      note_incoming_invoice_adjustment: {
        Args: {
          p_agreed_on: string
          p_agreed_with: string
          p_amount: number
          p_details?: Json
          p_discount_until: string
          p_invoice_id: string
          p_kind: string
          p_percent: number
          p_reason: string
        }
        Returns: {
          actor_id: string | null
          actor_name: string
          agreed_on: string | null
          agreed_with: string | null
          amount: number
          company_id: string
          created_at: string
          details: Json
          discount_until: string | null
          id: string
          invoice_id: string
          kind: string
          percent: number | null
          reason: string
          reverses_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
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
      purge_expired_logs: { Args: { p_now?: string }; Returns: Json }
      quote_decision_check_time: {
        Args: { p_decided_at: string; p_quote_id: string }
        Returns: undefined
      }
      quote_decision_lock: {
        Args: { p_quote_id: string }
        Returns: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_incoming_invoice_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method?: string
          p_note?: string
          p_paid_at: string
        }
        Returns: {
          actor_id: string | null
          actor_name: string
          amount: number
          company_id: string
          created_at: string
          id: string
          incoming_invoice_id: string
          method: string
          note: string
          paid_at: string
          reason: string
          reverses_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_incoming_rejection_mail: {
        Args: { p_invoice_id: string; p_mail_id: string }
        Returns: {
          action: string
          actor_id: string | null
          actor_name: string
          company_id: string
          created_at: string
          field: string | null
          id: string
          invoice_id: string
          mail_reference: string | null
          new_value: string | null
          old_value: string | null
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recurrence_covers_date: {
        Args: { p_date: string; p_rule: string; p_series_start: string }
        Returns: boolean
      }
      request_company_termination: {
        Args: { p_company_id: string; p_export_notice_confirmed: boolean }
        Returns: Json
      }
      reserve_quote_confirmation: {
        Args: { p_quote_id: string; p_user_id: string }
        Returns: {
          acceptance_event_id: string
          accepted_on: string | null
          company_id: string
          confirmation_date: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          document_number: string
          id: string
          quote_id: string
          selected_item_ids: string[]
          storage_path: string | null
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quote_confirmations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_inbound_mail_file: {
        Args: { p_decision: string; p_file_id: string }
        Returns: Json
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
      reverse_incoming_invoice_adjustment: {
        Args: { p_adjustment_id: string; p_reason: string }
        Returns: {
          actor_id: string | null
          actor_name: string
          agreed_on: string | null
          agreed_with: string | null
          amount: number
          company_id: string
          created_at: string
          details: Json
          discount_until: string | null
          id: string
          invoice_id: string
          kind: string
          percent: number | null
          reason: string
          reverses_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_incoming_invoice_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: {
          actor_id: string | null
          actor_name: string
          amount: number
          company_id: string
          created_at: string
          id: string
          incoming_invoice_id: string
          method: string
          note: string
          paid_at: string
          reason: string
          reverses_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revert_quote_decision: {
        Args: { p_quote_id: string; p_reason: string }
        Returns: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_incoming_invoice: {
        Args: { p_decision: string; p_invoice_id: string; p_reason?: string }
        Returns: {
          action: string
          actor_id: string | null
          actor_name: string
          company_id: string
          created_at: string
          field: string | null
          id: string
          invoice_id: string
          mail_reference: string | null
          new_value: string | null
          old_value: string | null
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_company_termination: {
        Args: { p_company_id: string }
        Returns: Json
      }
      revoke_employment_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      run_company_lifecycle_job: { Args: never; Returns: Json }
      sales_document_buyer_snapshot: {
        Args: { p_customer_id: string }
        Returns: {
          buyer_city: string
          buyer_contact_name: string
          buyer_country: string
          buyer_customer_number: string
          buyer_email: string
          buyer_name: string
          buyer_postal_code: string
          buyer_street: string
          buyer_vat_id: string
        }[]
      }
      save_quote_draft: {
        Args: {
          p_header: Json
          p_items?: Json
          p_quote_id: string
          p_version?: Json
        }
        Returns: Json
      }
      save_sales_document_draft: {
        Args: { p_document_id: string; p_header: Json; p_lines?: Json }
        Returns: string
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
      set_company_mail_settings: {
        Args: {
          p_allowlist: string[]
          p_company_id: string
          p_mail_mode: string
        }
        Returns: {
          effective_mode: string
          mail_mode: string
          mode_cap: string
          test_recipient_allowlist: string[]
        }[]
      }
      set_contact_number_start: {
        Args: { p_company_id: string; p_kind: string; p_next: number }
        Returns: undefined
      }
      set_default_invoice_template: {
        Args: { p_company_id: string; p_template_id: string }
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
      set_inbound_sender_allowlist: {
        Args: { p_allowlist: string[]; p_company_id: string }
        Returns: string[]
      }
      set_incoming_invoice_tax_lines: {
        Args: { p_invoice_id: string; p_lines: Json }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          net_amount: number
          tax_mode: string
          tax_rate_percent: number
          vat_amount: number
        }[]
        SetofOptions: {
          from: "*"
          to: "incoming_invoice_tax_lines"
          isOneToOne: false
          isSetofReturn: true
        }
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
      switch_primary_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      update_document_payment_status: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      withdraw_quote: {
        Args: { p_note?: string; p_quote_id: string }
        Returns: {
          accepted_version_id: string | null
          company_id: string
          contact_person_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_kind: string | null
          decision_note: string
          decision_recorded_at: string | null
          decline_reason: string
          document_number: string | null
          follow_up_on: string | null
          id: string
          kind: string
          modified_at: string
          order_id: string | null
          origin: string
          responsible_user_id: string | null
          site_city: string
          site_country: string
          site_postal_code: string
          site_street: string
          subject: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
