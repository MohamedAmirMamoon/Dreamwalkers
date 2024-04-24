// Define an object to represent the user's bag with item names as keys and corresponding image paths as values
// Define bag object to store bought items and their images
const bag = {
    "Healing Ivy": "images/bigVine.png",
    "Dream Lance": "images/lanceBig.png",
    "Herbalist": "images/medal.png"
    // Add more items to the bag as needed
  };
  
 // Get the container element for the bag grid
var bagGrid = document.querySelector('.bag-grid');

// Loop through the bagItems object and create HTML elements for each item
for (var itemName in bagItems) {
    if (bagItems.hasOwnProperty(itemName)) {
        var itemImagePath = bagItems[itemName];
        var itemElement = document.createElement('div');
        itemElement.classList.add('bag-item');
        var itemImage = document.createElement('img');
        itemImage.src = itemImagePath;
        itemImage.alt = itemName;
        itemElement.appendChild(itemImage);
        bagGrid.appendChild(itemElement);
    }
}
  // Function to go back to index.html
  function goBack() {
    window.location.href = 'index.html';
  }
  
  // Call the function to initially create the purple items
  createPurpleItems();
  