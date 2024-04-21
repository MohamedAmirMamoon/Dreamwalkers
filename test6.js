let currentHP = 50;
let yourCurrentHP = 50;

document.addEventListener('DOMContentLoaded', () => {

    const fightImageButton = document.getElementById('fightButton');
    const fightMessage = document.getElementById('fightMessage');

    fightImageButton.addEventListener('click', () => {


lightedOptionIndex = 0;
    //     }

        currentHP -= 10;
        document.getElementById('hpText').textContent = `HP: ${currentHP}/50`;

        
        changeSnakeColor();

       
        const rectangles = document.querySelectorAll('.rectangle');
        hideRectangles(rectangles);

 
        setTimeout(() => {
 
            fightMessage.innerHTML = '<strong>Snake Attack</strong>';
            fightMessage.style.display = 'block';

         
            setTimeout(() => {
                fightMessage.style.display = 'none';

         
                setTimeout(() => {
                    yourCurrentHP -= 10;
                    document.getElementById('hpText2').textContent = `HP: ${yourCurrentHP}/50`;

                    const yourRectangles = document.querySelectorAll('.rectangle1');
                    hideRectangles(yourRectangles);
                }, 2000); 
            }, 1000); 
        }, 2000); 
    });
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
    }
}

function hideAllExceptBackground() {
  
    document.querySelector('.boxy').style.display = 'none';

   
    document.getElementById('fightButton').style.display = 'none';

    
    document.getElementById('blockButton').style.display = 'none';
    document.getElementById('escapeButton').style.display = 'none';

   
    document.getElementById('message').style.display = 'block';
}

