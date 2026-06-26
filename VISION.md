# CUSTOMSTECH MASTER PRODUCT VISION
Enterprise Customs Operations Platform - Version 1.0

## Core Philosophy
CustomsTech is designed as an Enterprise Customs Operations Platform that assists customs brokerage firms, importers, exporters, and logistics providers by automating daily customs operations. It is the "operating system for customs brokerage firms," designed to complement, not replace, the BOC E2M System.

## Architecture & Security
- Strictly Multi-Tenant SaaS Architecture (One backend/frontend, isolated organization data).
- Role-Based Access Control (RBAC): Owner, Licensed Customs Broker, Operations Manager, Processor, Accounting, Documentation, Client.
- Immutable Audit Trails (Created By, Modified By, Timestamp, Revision).

## Core Modules
- Dashboard
- Client Management
- Shipment Tracker
- Entry Worksheet (Drafting & data entry)
- Assessment Builder (Core financial/duty calculation engine)
- Assessment Dashboard & Historical SAD
- AHTN Search Engine (Live HS Code lookup)
- Document Management

## Tech Stack
Frontend: React + Vite
Backend: Python FastAPI
Database/Auth: Supabase
Hosting: Vercel + Render
