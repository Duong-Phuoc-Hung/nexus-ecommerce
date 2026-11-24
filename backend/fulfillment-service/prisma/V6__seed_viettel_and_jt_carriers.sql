-- =============================================================================
-- Project Nexus - Fulfillment Service Migration V6 (SRS 3.6)
-- Database: PostgreSQL (nexus_fulfillment_db - Port 5436)
-- Bổ sung đối tác vận chuyển Viettel Post và J&T Express
-- =============================================================================

INSERT INTO fulfillment_carriers (carrier_code, carrier_name, is_active, api_endpoint)
VALUES 
('VIETTEL_POST', 'Viettel Post', TRUE, 'https://partner.viettelpost.vn/v2'),
('JT_EXPRESS', 'J&T Express', TRUE, 'https://vip.jtexpress.vn/api/v1')
ON CONFLICT (carrier_code) DO NOTHING;

SELECT setval('fulfillment_carriers_id_seq', (SELECT MAX(id) FROM fulfillment_carriers));
