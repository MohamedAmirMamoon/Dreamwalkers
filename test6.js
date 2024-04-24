let currentHP = 50;
let yourCurrentHP = 50;


document.addEventListener('DOMContentLoaded', () => {
   const fightMessage = document.getElementById('fightMessage');
   const optionsContainer = document.getElementById('optionsContainer');
   const options = ['Punch 10x', 'Double Kick 20x', 'Energy Blast 30x'];
   let highlightedOptionIndex = 0;
   let remainingRectangles = 10;


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


   function handleOptionSelection(selectedOption) {
       // Perform action based on the selected option
       switch(selectedOption) {
           case 'Punch 10x':
               if (remainingRectangles >= 1) {
                   snakeLosesRectangles(1);
                   remainingRectangles -= 1;
               }
               break;
           case 'Double Kick 20x':
               if (remainingRectangles >= 2) {
                   snakeLosesRectangles(2);
                   remainingRectangles -= 2;
               }
               break;
           case 'Energy Blast 30x':
               if (remainingRectangles >= 3) {
                   snakeLosesRectangles(3);
                   remainingRectangles -= 3;
               }
               break;
           default:
               console.log('Invalid option');
       }
   }


   // Sample function to simulate snake losing rectangles
   function snakeLosesRectangles(number) {
       // Select the first 'number' rectangles and remove them
       for (let i = 0; i < number; i++) {
           const rectangleToRemove = document.getElementById(`rectangle${i + 1}`);
           if (rectangleToRemove) {
               rectangleToRemove.style.display = 'none';
           }
       }
   }
//     fightImageButton.addEventListener('click', () => {




// lightedOptionIndex = 0;
//     //     }


//         currentHP -= 10;
//         document.getElementById('hpText').textContent = `HP: ${currentHP}/50`;


      
//         changeSnakeColor();


     
//         const rectangles = document.querySelectorAll('.rectangle');
//         hideRectangles(rectangles);


//         setTimeout(() => {
//             fightMessage.innerHTML = '<strong>Snake Attack</strong>';
//             fightMessage.style.display = 'block';


       
//             setTimeout(() => {
//                 fightMessage.style.display = 'none';


       
//                 setTimeout(() => {
//                     yourCurrentHP -= 10;
//                     document.getElementById('hpText2').textContent = `HP: ${yourCurrentHP}/50`;


//                     const yourRectangles = document.querySelectorAll('.rectangle1');
//                     hideRectangles(yourRectangles);
//                 }, 2000);
//             }, 1000);
//         }, 2000);
//     });
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
   const snake = document.getElementById('snake');
   snake.style.filter = 'hue-rotate(180deg)';
   setTimeout(() => {
       snake.style.filter = 'none';
   }, 300);
}


function hideRectangles(rectangles) {
   let firstVisibleRectangle = null;
   for (var i = 0; i < rectangles.length; i++) {
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
       const snakeContainer = document.querySelector('.snake-container');
       snakeContainer.style.display = 'none';
       const message = document.getElementById('message');
       message.style.display = 'block';
       exitGame(); 
   }
}


function hideAllExceptBackground() {
    document.querySelector('.boxy').style.display = 'none';


 
   document.getElementById('fightButton').style.display = 'none';


  
   document.getElementById('blockButton').style.display = 'none';
   document.getElementById('escapeButton').style.display = 'none';


 
   document.getElementById('message').style.display = 'block';
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