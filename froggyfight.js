let currentHP = 20;
let yourCurrentHP = 50;
let lastAttack = '';
let canInteract = true;
let missedMessageVisible = false;
let totalHiddenRectangles = 0;
let lastHiddenRectangle = null;

document.addEventListener('DOMContentLoaded', () => {
   const fightMessage = document.getElementById('fightMessage');
   const optionsContainer = document.getElementById('optionsContainer');
   const options = ['Punch 5x', 'Double Kick 10x', 'Energy Blast 15x'];
   let highlightedOptionIndex = 0;
   let remainingRectangles = 10;
   let remainingRectangles1 = 10;

   const fightImageButton = document.getElementById('fightButton');

   fightImageButton.addEventListener('click', () => {
       if (remainingRectangles > 0) { // Check if there are remaining rectangles

           // Clear previous options
           optionsContainer.innerHTML = '';

           // Display options as text in a column
           options.forEach((option, index) => {
               const optionText = document.createElement('div');
               optionText.textContent = option;
               optionText.classList.add('option-text');
               if (index === highlightedOptionIndex) {
                   optionText.classList.add('highlighted');
               }
               optionsContainer.appendChild(optionText);
           });

           // Show the options container
           optionsContainer.style.display = 'flex';
       }
   });

   document.addEventListener('keydown', (event) => {
       const key = event.key.toLowerCase();
       if (key === 'arrowdown') {
           highlightedOptionIndex = Math.min(highlightedOptionIndex + 1, options.length - 1);
       } else if (key === 'arrowup') {
           highlightedOptionIndex = Math.max(highlightedOptionIndex - 1, 0);
       } else if (key === 'enter' && optionsContainer.style.display === 'flex') { // Check if options are displayed
           handleOptionSelection(options[highlightedOptionIndex]);
           optionsContainer.style.display = 'none'; // Hide options after selection
       }

       updateHighlightedOption();
   });

   function handleOptionSelection(selectedOption) {
       if (!canInteract || missedMessageVisible) {
           return;
       }
       const attackWorks = Math.random() < 0.9;
       if (attackWorks) {
           switch(selectedOption) {
               case 'Punch 5x':
                   if (lastAttack == 'Double Kick 10x'){
                       hideRectangles(remainingRectangles1);
                       decreaseSnakeRectangles(5);
                   } else {
                       hideRectangles(5);
                       decreaseSnakeRectangles(5);
                   }
                   changeSnakeColor();
                   updateHP(5);
                   break;
               case 'Double Kick 10x':
                   if(lastAttack == "Energy Blast 15x"){
                       hideRectangles(remainingRectangles1);
                       decreaseSnakeRectangles(10);
                   } else if(lastAttack == "Punch 5x"){
                       hideRectangles(remainingRectangles1);
                       decreaseSnakeRectangles(5);
                   } else {
                       hideRectangles(10);
                       decreaseSnakeRectangles(10);
                   }
                   changeSnakeColor();
                   updateHP(10);
                   break;
               case 'Energy Blast 15x':
                   if (lastAttack == 'Double Kick 10x') {
                       hideRectangles(remainingRectangles);
                       hideRectangles(remainingRectangles1);
                       decreaseSnakeRectangles(15);
                   } else if(lastAttack == "Punch 5x") {
                       hideRectangles(remainingRectangles1);
                       decreaseSnakeRectangles(15);
                   } else {
                       hideRectangles(15);
                       decreaseSnakeRectangles(15);
                   }
                   changeSnakeColor();
                   updateHP(15);
                   break;
               default:
                   console.log('Invalid option');
           }
           lastAttack = selectedOption;
           setTimeout(() => {
               snakeAttack();
           }, 900);
       } else {
           const fightMessage = document.getElementById('fightMessage');
           fightMessage.textContent = 'You missed!';
           fightMessage.style.display = 'block';
           missedMessageVisible = true;
           setTimeout(() => {
               fightMessage.style.display = 'none';
               canInteract = true;
               missedMessageVisible = false;
           }, 2000);
           optionsContainer.style.pointerEvents = 'none';
       }
   }

   function updateHighlightedOption() {
       const optionTexts = document.querySelectorAll('.option-text');
       optionTexts.forEach((optionText, index) => {
           if (index === highlightedOptionIndex) {
               optionText.classList.add('highlighted');
           } else {
               optionText.classList.remove('highlighted');
           }
       });
   }

   function decreaseSnakeRectangles(number) {
       const snakeRectangles = document.querySelectorAll('.snake-rectangle');
       let visibleRectangles = Array.from(snakeRectangles).filter(rectangle => rectangle.style.opacity !== '0');
       let hiddenCount = 0;

       if (visibleRectangles.length > 0) {
           for (let i = 0; i < snakeRectangles.length; i++) {
               if (hiddenCount < number && snakeRectangles[i].style.opacity !== '0') {
                   snakeRectangles[i].style.opacity = '0';
                   hiddenCount++;
               }
           }
       }
   }

   
});

document.addEventListener('DOMContentLoaded', () => {
   const powerButtonImg = document.getElementById('powerButtonImg');
   const hpText = document.getElementById('hpText2');
   let yourCurrentHP = 50;

   powerButtonImg.addEventListener('click', () => {
       const maxHP = 50;

       if (yourCurrentHP + 10 <= maxHP) {
           yourCurrentHP += 10;
       } else {
           yourCurrentHP = maxHP;
       }

       hpText.textContent = `HP: ${yourCurrentHP}/${maxHP}`;

       if (lastHiddenRectangle !== null) {
           lastHiddenRectangle.style.opacity = '1';
           lastHiddenRectangle = null;
       }
   });
});

let snakeInterval;

document.addEventListener('DOMContentLoaded', () => {
   const snake = document.getElementById('snake');
   const images = ['./fightingsceneimage/snake1.png', './fightingsceneimage/snake2.png', './fightingsceneimage/snake3.png', './fightingsceneimage/snake4.png'];
   let currentIndex = 0;

   snakeInterval = setInterval(() => {
       currentIndex = (currentIndex + 1) % images.length;
       snake.src = images[currentIndex];
   }, 600);

   const fightImageButton = document.getElementById('fightButton');
   fightImageButton.addEventListener('click', () => {

       changeSnakeColor();

       const rectangles = document.querySelectorAll('.rectangle');
       hideRectangles(rectangles);
   });
});

function changeSnakeColor() {
   const snake = document.getElementById('frog');
   snake.style.filter = 'hue-rotate(180deg)';
   setTimeout(() => {
       snake.style.filter = 'none';
   }, 300);
}

function changeDanteColor() {
   const dante = document.getElementById('dante');
   dante.style.filter = 'hue-rotate(30deg) saturate(200%) brightness(200%)';
   setTimeout(() => {
       dante.style.filter = 'none';
   }, 800);
}

function hideRectangles(number) {
   let firstVisibleRectangle = null;
   const rectangles = document.querySelectorAll('.rectangle');
   for (let i = 0; i < rectangles.length; i++) {
       if (rectangles[i].style.opacity !== '0') {
           firstVisibleRectangle = rectangles[i];
           break;
       }
   }

   if (firstVisibleRectangle !== null) {
       firstVisibleRectangle.style.opacity = '0';
       checkIfAllHidden(rectangles);
   }
}

function checkIfAllHidden(rectangles) {
   let allHidden = true;
   rectangles.forEach(rectangle => {
       if (rectangle.style.opacity !== '0') {
           allHidden = false;
       }
   });

   if (allHidden) {
       clearInterval(snakeInterval);
       const snakeContainer = document.querySelector('.frog-container');
       snakeContainer.style.display = 'none';
       const message = document.getElementById('message');
       message.style.display = 'block';
       exitGame();
   }
}

function updateHP(damage) {
    // Calculate the new HP after taking damage
    const newHP = currentHP - damage;

    // Ensure HP doesn't go negative
    currentHP = newHP < 0 ? 0 : newHP;

    // Update the displayed HP text
    const hpText = document.getElementById('hpText');
    hpText.textContent = `HP: ${currentHP}/20`; // Updated HP text
}

function updateHPYou(damage) {
    // Calculate the new HP after taking damage
    const younewHP = yourCurrentHP - damage;

    // Ensure HP doesn't go negative
    yourCurrentHP = younewHP < 0 ? 0 : younewHP;

    // Update the displayed HP text
    const hpText2 = document.getElementById('hpText2');
    hpText2.textContent = `HP: ${yourCurrentHP}/50`; // Updated HP text
}

function exitGame() {
    localStorage.setItem('previousPosition', JSON.stringify({ x: previousX, y: previousY }));

    // Redirect back to the Overworld map
    window.location.href = "index.html"; // Change to the correct HTML file
}

function getPreviousPosition() {
    return JSON.parse(localStorage.getItem('previousPosition'));
}

// Initial position variables
var previousX = 0;
var previousY = 0;

// Call this function when entering the shop scene to update the previous position
function updatePreviousPosition(x, y) {
    previousX = x;
    previousY = y;
}

function snakeAttack() {
    // Decrease Dante's HP (you can adjust the damage value as needed)
    const damageToDante = 10;
    updateHPYou(damageToDante); // Decrease Dante's HP
    changeDanteColor(); // Turn Dante purple

    // Display "Snake Attack" message
    const fightMessage = document.getElementById('fightMessage');
    fightMessage.textContent = 'Snake Attack!';
    fightMessage.style.display = 'block';

    // Reset message display and enable interaction after some time
    setTimeout(() => {
        fightMessage.style.display = 'none';
        canInteract = true;
    }, 2000); // Adjust the delay time as needed
}