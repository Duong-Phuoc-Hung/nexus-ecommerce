-- ==============================================================================
-- PROJECT NEXUS: CHAT SERVICE DATABASE SCHEMA (SRS 2.3, 3.1.2, 3.6)
-- Multi-party Chat, Order Tracking, Versioned Policy FAQs & Dispute Escalation
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChannelType') THEN
        CREATE TYPE "ChannelType" AS ENUM ('AI_BOT', 'BUYER_SELLER', 'BUYER_SUPPORT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageSenderRole') THEN
        CREATE TYPE "MessageSenderRole" AS ENUM ('BUYER', 'SELLER', 'SUPPORT_STAFF', 'AI', 'SYSTEM');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    channel_type "ChannelType" NOT NULL,
    buyer_id VARCHAR(36) NOT NULL,
    seller_id VARCHAR(36) NOT NULL,
    support_case_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_order_channel UNIQUE (order_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_order ON chat_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_buyer ON chat_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_seller ON chat_conversations(seller_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) NOT NULL,
    sender_role "MessageSenderRole" NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_time ON chat_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS platform_policies (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    policy_code VARCHAR(50) NOT NULL UNIQUE,
    version VARCHAR(20) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE,
    title VARCHAR(255) NOT NULL,
    default_value JSONB NOT NULL,
    content TEXT NOT NULL,
    citation_source VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policies_category ON platform_policies(category);
CREATE INDEX IF NOT EXISTS idx_policies_code ON platform_policies(policy_code);
