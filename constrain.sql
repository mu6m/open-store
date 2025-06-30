CREATE OR REPLACE FUNCTION check_cart_quantity()
RETURNS TRIGGER AS $$
DECLARE
    product_quantity INTEGER;
    product_quantity_type TEXT;
    total_cart_quantity INTEGER;
BEGIN
    -- Get product quantity and quantity type
    SELECT quantity, quantity_type INTO product_quantity, product_quantity_type
    FROM products 
    WHERE id = NEW.product_id;
    
    -- If product doesn't exist, raise exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found', NEW.product_id;
    END IF;
    
    -- Only check stock for limited quantity products
    IF product_quantity_type = 'limited' THEN
        -- Calculate total quantity in cart for this product and user (ignoring selected_details)
        SELECT COALESCE(SUM(quantity), 0) INTO total_cart_quantity
        FROM cart_items 
        WHERE user_id = NEW.user_id 
        AND product_id = NEW.product_id;
        
        -- For updates, subtract the old quantity and add the new quantity
        IF TG_OP = 'UPDATE' THEN
            total_cart_quantity := total_cart_quantity - OLD.quantity + NEW.quantity;
        ELSE
            -- For inserts, add the new quantity
            total_cart_quantity := total_cart_quantity + NEW.quantity;
        END IF;
        
        -- Check if total quantity exceeds available stock
        IF total_cart_quantity > product_quantity THEN
            RAISE EXCEPTION 'Not enough stock for product %. Available: %, Requested: %', 
                NEW.product_id, product_quantity, total_cart_quantity;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER cart_quantity_check
    BEFORE INSERT OR UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION check_cart_quantity();

-- show triggers

SELECT * FROM information_schema.triggers;

-- drop triggers

CREATE OR REPLACE FUNCTION strip_all_triggers() RETURNS text AS $$ DECLARE
    triggNameRecord RECORD;
    triggTableRecord RECORD;
BEGIN
    FOR triggNameRecord IN select distinct(trigger_name) from information_schema.triggers where trigger_schema = 'public' LOOP
        FOR triggTableRecord IN SELECT distinct(event_object_table) from information_schema.triggers where trigger_name = triggNameRecord.trigger_name LOOP
            RAISE NOTICE 'Dropping trigger: % on table: %', triggNameRecord.trigger_name, triggTableRecord.event_object_table;
            EXECUTE 'DROP TRIGGER ' || triggNameRecord.trigger_name || ' ON ' || triggTableRecord.event_object_table || ';';
        END LOOP;
    END LOOP;

    RETURN 'done';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

select strip_all_triggers();