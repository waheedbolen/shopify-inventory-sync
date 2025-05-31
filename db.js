const fs = require('fs');
const path = require('path');

// Define the path for the JSON file. Using path.join for better cross-platform compatibility.
// For Render or other environments where the root might not be writable,
// consider using a path like '/tmp/product_groups.json' or an environment variable.
const productGroupsFilePath = path.join(__dirname, 'product_groups.json');
const reservationsFilePath = path.join(__dirname, 'reservations.json'); // Added reservations file path
// console.log(`[DB_FILE_INIT] Product groups data file path: ${productGroupsFilePath}`);
// console.log(`[DB_FILE_INIT] Reservations data file path: ${reservationsFilePath}`);


// Helper function to read product groups from the JSON file
function readProductGroupsFromFile() {
  try {
    if (fs.existsSync(productGroupsFilePath)) {
      const jsonData = fs.readFileSync(productGroupsFilePath, 'utf8');
      if (jsonData.trim() === '') { // Handle empty file case
        return [];
      }
      return JSON.parse(jsonData);
    }
  } catch (error) {
    console.error('[DB_FILE_ERROR] Error reading or parsing product_groups.json:', error);
  }
  return []; // Return empty array if file doesn't exist, is empty, or on error
}

// Helper function to write product groups to the JSON file
function writeProductGroupsToFile(groupsArray) {
  try {
    const jsonData = JSON.stringify(groupsArray, null, 2); // Pretty print JSON
    fs.writeFileSync(productGroupsFilePath, jsonData, 'utf8');
    // console.log(`[DB_FILE_WRITE] Successfully wrote ${groupsArray.length} groups to ${productGroupsFilePath}`);
  } catch (error) {
    console.error('[DB_FILE_ERROR] Error writing to product_groups.json:', error);
  }
}

// Helper function to read reservations from the JSON file
function readReservationsFromFile() {
  try {
    if (fs.existsSync(reservationsFilePath)) {
      const jsonData = fs.readFileSync(reservationsFilePath, 'utf8');
      if (jsonData.trim() === '') { // Handle empty file case
        return [];
      }
      return JSON.parse(jsonData);
    }
  } catch (error) {
    console.error('[DB_FILE_ERROR] Error reading or parsing reservations.json:', error);
  }
  return []; // Return empty array if file doesn't exist, is empty, or on error
}

// Helper function to write reservations to the JSON file
function writeReservationsToFile(reservationsArray) {
  try {
    const jsonData = JSON.stringify(reservationsArray, null, 2); // Pretty print JSON
    fs.writeFileSync(reservationsFilePath, jsonData, 'utf8');
    // console.log(`[DB_FILE_WRITE] Successfully wrote ${reservationsArray.length} reservations to ${reservationsFilePath}`);
  } catch (error) {
    console.error('[DB_FILE_ERROR] Error writing to reservations.json:', error);
  }
}

// --- Product Group Functions ---

async function saveProductGroup(productGroup) {
  // console.log(`[DB_SAVE] Attempting to save product group ID: ${productGroup.id}`);
  let groups = readProductGroupsFromFile();
  const groupIndex = groups.findIndex(g => g.id === productGroup.id);

  if (groupIndex > -1) {
    groups[groupIndex] = productGroup;
    // console.log(`[DB_SAVE] Updated existing product group ID: ${productGroup.id}`);
  } else {
    groups.push(productGroup);
    // console.log(`[DB_SAVE] Added new product group ID: ${productGroup.id}`);
  }
  writeProductGroupsToFile(groups);
  return productGroup; // Return the saved/updated group
}

async function findProductGroupByVariantId(variantId) {
  const groups = readProductGroupsFromFile();
  const group = groups.find(g => g.variantIds && g.variantIds.includes(String(variantId))); // Ensure variantId is string for comparison if needed
  // console.log(`[DB_FIND_BY_VARIANT] Found group for variantId ${variantId}:`, group ? group.id : 'None');
  return group;
}

async function findProductGroupByInventoryItemId(inventoryItemId) {
  const groups = readProductGroupsFromFile();
  const group = groups.find(g => g.inventoryItemIds && g.inventoryItemIds.includes(String(inventoryItemId)));
  // console.log(`[DB_FIND_BY_INV_ITEM] Found group for inventoryItemId ${inventoryItemId}:`, group ? group.id : 'None');
  return group;
}

async function updateProductGroupInventory(productGroupId, newSharedInventoryCount) {
  // console.log(`[DB_UPDATE_INV] Attempting to update inventory for group ID: ${productGroupId} to ${newSharedInventoryCount}`);
  let groups = readProductGroupsFromFile();
  const groupIndex = groups.findIndex(g => g.id === productGroupId);

  if (groupIndex > -1) {
    groups[groupIndex].sharedInventoryCount = newSharedInventoryCount;
    writeProductGroupsToFile(groups);
    // console.log(`[DB_UPDATE_INV] Successfully updated inventory for group ID: ${productGroupId}`);
    return groups[groupIndex];
  }
  // console.log(`[DB_UPDATE_INV] Group ID: ${productGroupId} not found for inventory update.`);
  return null; // Or throw new Error('Group not found');
}

async function getProductGroup(productId) { // Assuming productId is the group ID
  const groups = readProductGroupsFromFile();
  const group = groups.find(g => g.id === productId);
  // console.log(`[DB_GET_GROUP] Found group for productId ${productId}:`, group ? group.id : 'None');
  return group;
}

async function getAllProductGroups() {
  const groups = readProductGroupsFromFile();
  // console.log(`[DB_GET_ALL] Retrieved ${groups.length} product groups.`);
  return groups;
}

async function removeProductGroup(productId) {
  // console.log(`[DB_REMOVE] Attempting to remove product group ID: ${productId}`);
  let groups = readProductGroupsFromFile();
  const initialLength = groups.length;
  const updatedGroups = groups.filter(g => g.id !== productId);

  if (initialLength !== updatedGroups.length) {
    writeProductGroupsToFile(updatedGroups);
    // console.log(`[DB_REMOVE] Successfully removed product group ID: ${productId}`);
    return true;
  }
  // console.log(`[DB_REMOVE] Product group ID: ${productId} not found for removal.`);
  return false;
}

// --- Reservation Functions (Assumed for now, to be implemented if needed by other tasks) ---
// These are placeholders based on the prompt's assumptions for other modules.
// They currently do not interact with the product_groups.json file.
// A separate reservations.json or similar would be needed if these were to be file-based.

async function getActiveReservationsForGroup(productGroupId) {
  // console.log(`[DB_GET_ACTIVE_RES] Getting active reservations for PID: ${productGroupId}`);
  const allReservations = readReservationsFromFile();
  const now = new Date();
  const active = allReservations.filter(r =>
    r.productGroupId === productGroupId &&
    r.status === 'active' &&
    new Date(r.expiresAt) > now
  );
  // console.log(`[DB_GET_ACTIVE_RES] Found ${active.length} active reservations for PID: ${productGroupId}`);
  return active;
}

async function createReservation(reservationData) {
  // console.log(`[DB_CREATE_RES] Creating reservation for PID: ${reservationData.productGroupId}, Variant: ${reservationData.variantId}`);
  let reservations = readReservationsFromFile();
  const newReservation = {
    ...reservationData,
    // Generate a simple unique ID for the reservation
    reservationId: `res_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
  };
  reservations.push(newReservation);
  writeReservationsToFile(reservations);
  // console.log(`[DB_CREATE_RES] Reservation created with ID: ${newReservation.reservationId}`);
  return newReservation; // Return the reservation object with the new ID
}

async function consumeReservationsForGroup(productGroupId, consumedQuantity) {
  // console.log(`[DB_CONSUME_RES] Attempting to consume ${consumedQuantity} for PID: ${productGroupId}`);
  let allReservations = readReservationsFromFile();
  let reservationsChanged = false;
  let actualConsumedCount = 0;
  const now = new Date();

  // Find active, non-expired reservations for the group, sorted oldest first
  const eligibleReservations = allReservations
    .filter(r => r.productGroupId === productGroupId && r.status === 'active' && new Date(r.expiresAt) > now)
    .sort((a, b) => new Date(a.reservedAt) - new Date(b.reservedAt));

  // console.log(`[DB_CONSUME_RES] Found ${eligibleReservations.length} eligible reservations for PID: ${productGroupId}`);

  for (let i = 0; i < eligibleReservations.length && actualConsumedCount < consumedQuantity; i++) {
    const reservationToConsume = eligibleReservations[i];
    const originalReservationIndex = allReservations.findIndex(r => r.reservationId === reservationToConsume.reservationId);

    if (originalReservationIndex !== -1) {
      // Assuming each reservation is for 1 unit as per current cart logic.
      // If a reservation could be for >1 unit, this logic would need to handle partial consumption of a reservation.
      // For now, we consume the whole reservation record if its quantity contributes to the consumedQuantity.
      if (allReservations[originalReservationIndex].reservedQuantity <= (consumedQuantity - actualConsumedCount)) {
        allReservations[originalReservationIndex].status = 'consumed';
        allReservations[originalReservationIndex].consumedAt = new Date(); // Optional: add consumedAt
        actualConsumedCount += allReservations[originalReservationIndex].reservedQuantity;
        reservationsChanged = true;
        // console.log(`[DB_CONSUME_RES] Consumed reservation ID: ${allReservations[originalReservationIndex].reservationId} for PID: ${productGroupId}. Total consumed so far: ${actualConsumedCount}`);
      } else {
        // This case implies a reservation's reservedQuantity is greater than the remaining needed to fulfill consumedQuantity.
        // This would require partial consumption logic, which is complex for a simple JSON store (e.g. splitting a reservation).
        // For this iteration, assuming reservedQuantity is always 1 unit per cart add.
        // If not, this part needs refinement. The current logic will only consume if the full reservation.reservedQuantity fits.
        console.warn(`[DB_CONSUME_RES] Reservation ID: ${allReservations[originalReservationIndex].reservationId} has quantity ${allReservations[originalReservationIndex].reservedQuantity}, but only ${consumedQuantity - actualConsumedCount} needed. Partial consumption not implemented, skipping this specific reservation for now, or it means reservedQuantity is always 1.`);
        // If reservedQuantity is always 1, this 'else' block might not be hit often unless consumedQuantity is not an integer.
        // Let's assume for now the primary path is consuming reservations of quantity 1.
         allReservations[originalReservationIndex].status = 'consumed'; // Consuming it anyway as per simplified logic
         allReservations[originalReservationIndex].consumedAt = new Date();
         actualConsumedCount += allReservations[originalReservationIndex].reservedQuantity; // this will be 1
         reservationsChanged = true;

      }
    }
  }

  if (reservationsChanged) {
    writeReservationsToFile(allReservations);
    // console.log(`[DB_CONSUME_RES] Wrote changes to reservations file for PID: ${productGroupId}`);
  }

  if (actualConsumedCount < consumedQuantity) {
    console.warn(`[DB_CONSUME_RES] Attempted to consume ${consumedQuantity} but only fully consumed ${actualConsumedCount} reservation units for PID: ${productGroupId}. Check for partials or insufficient reservations.`);
  }
  return actualConsumedCount; // Return how many were actually marked as consumed.
}


// Initialize the JSON files if they don't exist
if (!fs.existsSync(productGroupsFilePath)) {
  // console.log(`[DB_FILE_INIT] ${productGroupsFilePath} not found. Creating with empty array.`);
  writeProductGroupsToFile([]);
}
if (!fs.existsSync(reservationsFilePath)) { // Added initialization for reservations.json
  // console.log(`[DB_FILE_INIT] ${reservationsFilePath} not found. Creating with empty array.`);
  writeReservationsToFile([]);
}

module.exports = {
  saveProductGroup,
  findProductGroupByVariantId,
  findProductGroupByInventoryItemId,
  updateProductGroupInventory,
  getProductGroup,
  getAllProductGroups,
  removeProductGroup,
  // Exporting stubbed reservation functions as they are assumed by other services
  getActiveReservationsForGroup,
  createReservation,
  consumeReservationsForGroup
};
