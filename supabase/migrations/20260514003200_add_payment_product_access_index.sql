create index if not exists payments_reading_product_status_idx
on payments(reading_id, product_type, status);
