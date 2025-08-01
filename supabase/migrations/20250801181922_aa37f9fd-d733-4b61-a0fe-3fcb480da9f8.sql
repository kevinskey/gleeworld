-- Fix the security issue by updating the function to set search_path
CREATE OR REPLACE FUNCTION update_wardrobe_item_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Update available quantity based on checkout status changes
  IF TG_OP = 'INSERT' THEN
    -- Item checked out, decrease available quantity
    UPDATE wardrobe_items 
    SET available_quantity = available_quantity - NEW.quantity
    WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed
    IF OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
      -- Item checked in, increase available quantity
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity + NEW.quantity
      WHERE id = NEW.item_id;
    ELSIF OLD.status = 'checked_in' AND NEW.status = 'checked_out' THEN
      -- Item checked out again, decrease available quantity
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity - NEW.quantity
      WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Checkout record deleted, increase available quantity if it was checked out
    IF OLD.status = 'checked_out' THEN
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity + OLD.quantity
      WHERE id = OLD.item_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';