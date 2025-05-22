// Cart monitoring script to be injected into the store theme
// This script intercepts "Add to Cart" actions and communicates with the app server

/**
 * Shopify Inventory Sync - Cart Monitor
 * 
 * This script intercepts "Add to Cart" actions and ensures that
 * when a product variation is added to cart, all other variations
 * of the same product are immediately marked as unavailable.
 */
(function() {
  // Configuration
  const APP_SERVER_URL = '{{APP_SERVER_URL}}'; // Will be replaced with actual URL during installation
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Find all add to cart buttons/forms
    setupCartMonitoring();
  });
  
  /**
   * Set up monitoring for all add to cart actions
   */
  function setupCartMonitoring() {
    // Monitor form submissions (standard cart forms)
    document.querySelectorAll('form[action="/cart/add"]').forEach(form => {
      form.addEventListener('submit', handleAddToCart);
    });
    
    // Monitor AJAX add to cart buttons
    document.querySelectorAll('[data-add-to-cart]').forEach(button => {
      button.addEventListener('click', handleAddToCart);
    });
    
    // Monitor for dynamic changes (for themes that load content dynamically)
    observeDynamicChanges();
    
    console.log('Shopify Inventory Sync: Cart monitoring initialized');
  }
  
  /**
   * Handle add to cart event
   * @param {Event} event - The form submission or button click event
   */
  async function handleAddToCart(event) {
    try {
      // Get the form (either the event target or the parent of the clicked button)
      const form = event.target.tagName === 'FORM' ? event.target : event.target.closest('form');
      
      if (!form) {
        console.log('Shopify Inventory Sync: No form found');
        return;
      }
      
      // Find the variant ID
      let variantId = getVariantIdFromForm(form);
      
      if (!variantId) {
        console.log('Shopify Inventory Sync: No variant ID found');
        return;
      }
      
      console.log(`Shopify Inventory Sync: Intercepted add to cart for variant ${variantId}`);
      
      // Temporarily prevent the default form submission
      event.preventDefault();
      
      // Notify the app server about the cart addition
      const response = await notifyCartAddition(variantId);
      
      if (response.success) {
        // Continue with the original form submission
        form.submit();
      } else {
        // Show error message
        showErrorMessage(form, response.message || 'This item is no longer available');
      }
    } catch (error) {
      console.error('Shopify Inventory Sync: Error handling add to cart', error);
      // Allow the form submission to continue to avoid blocking the user
      if (event.target.tagName === 'FORM') {
        event.target.submit();
      }
    }
  }
  
  /**
   * Get variant ID from a form
   * @param {HTMLFormElement} form - The add to cart form
   * @returns {string} The variant ID
   */
  function getVariantIdFromForm(form) {
    // Try to get variant ID from input field
    const variantInput = form.querySelector('input[name="id"]');
    if (variantInput && variantInput.value) {
      return variantInput.value;
    }
    
    // Try to get variant ID from select field
    const variantSelect = form.querySelector('select[name="id"]');
    if (variantSelect && variantSelect.value) {
      return variantSelect.value;
    }
    
    // Try to get from data attribute on the form
    if (form.dataset.variantId) {
      return form.dataset.variantId;
    }
    
    // Try to get from data attribute on the submit button
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton && submitButton.dataset.variantId) {
      return submitButton.dataset.variantId;
    }
    
    return null;
  }
  
  /**
   * Notify the app server about a cart addition
   * @param {string} variantId - The variant ID being added to cart
   * @returns {object} The response from the server
   */
  async function notifyCartAddition(variantId) {
    try {
      const response = await fetch(`${APP_SERVER_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variantId }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Shopify Inventory Sync: Error notifying server', error);
      // Return success to avoid blocking the user
      return { success: true };
    }
  }
  
  /**
   * Show error message near the form
   * @param {HTMLFormElement} form - The form to show the error near
   * @param {string} message - The error message
   */
  function showErrorMessage(form, message) {
    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'shopify-inventory-sync-error';
    errorElement.style.color = 'red';
    errorElement.style.marginTop = '10px';
    errorElement.textContent = message;
    
    // Remove any existing error messages
    const existingError = form.querySelector('.shopify-inventory-sync-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Add the error message after the form
    form.appendChild(errorElement);
    
    // Scroll to the error
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Observe dynamic changes to the DOM to handle dynamically added cart forms
   */
  function observeDynamicChanges() {
    // Create a mutation observer to watch for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain cart forms
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the node itself is a cart form
              if (node.matches && node.matches('form[action="/cart/add"]')) {
                node.addEventListener('submit', handleAddToCart);
              }
              
              // Check for cart forms within the added node
              if (node.querySelectorAll) {
                node.querySelectorAll('form[action="/cart/add"]').forEach(form => {
                  form.addEventListener('submit', handleAddToCart);
                });
                
                // Check for AJAX add to cart buttons
                node.querySelectorAll('[data-add-to-cart]').forEach(button => {
                  button.addEventListener('click', handleAddToCart);
                });
              }
            }
          });
        }
      });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
