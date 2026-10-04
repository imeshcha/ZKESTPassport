// Simple Noir circuit to check if asset value exceeds the minimum required threshold
fn main(asset_value: u64, asset_category: u8, minimum_required_value: pub u64, requested_category: pub u8) {
    // Check that the category matches
    assert(asset_category == requested_category);
    
    // Check that the value is greater than or equal to the minimum required value
    assert(asset_value >= minimum_required_value);
}
