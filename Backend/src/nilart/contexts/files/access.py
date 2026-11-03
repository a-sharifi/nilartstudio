"""Shared owned-download eligibility for library and dashboard reads."""
JOIN = " FROM customer_downloads d JOIN customer_orders o ON o.id=d.order_id "
ELIGIBLE = "d.active AND o.state->>'payment'='paid' AND o.state->>'fulfillment'!='cancelled' AND (d.commission_id IS NULL OR EXISTS (SELECT 1 FROM commission_requests c WHERE c.id=d.commission_id AND c.account_id=o.account_id AND c.status='approved'))"
