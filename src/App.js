import React, { useState } from 'react';
import './App.css';
import { riddles } from './riddles';
import 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';


const riddle_day = getRiddleDay();
var noOfGuesses = getNoOfGuesses();
var guesses = getGuesses();



function App() {
  // Only the setter is used: it re-renders so showAnswer() is re-evaluated
  // once the game ends.
  const [, setGuessesLeft] = useState(true);
  const listItems = guesses.map((guess) =>
    <li key={guess.id}>{guess}</li>

  );


  const onInputChange = (event) => {
    setText(event.target.value);
  }

  const [text, setText]  = useState('');
  const handleSubmit = event => {
    event.preventDefault();
    guesses.push(text);
    localStorage.setItem('guesses',JSON.stringify(guesses));
    if (Answer() === text) {
        // A correct guess ends the game, so it does not spend one of the
        // remaining guesses. Leaving noOfGuesses alone also keeps the number
        // on screen matching the one already in storage.
        setGuessesLeft(false);
        toast.success("correct!!");
        localStorage.setItem("playerWon", "true");
        localStorage.setItem("gameOver", "true");
    } else {
        noOfGuesses -= 1;
        localStorage.setItem("noOfGuesses", noOfGuesses)
        toast.error("Incorrect!");
        if (noOfGuesses === 0) {
          setGuessesLeft(false);
          localStorage.setItem("gameOver", "true");
        }
        setText('')
    }

  }

  return (
    <div className="App">
        <Toaster/>
        <div className="headings">
        <h1> Riddle </h1>
        </div>
        <form onSubmit={handleSubmit}>
        <div className='sub-headings'>
         <h3> Riddle # {parseInt(riddle_day) + 1} / {riddles.length}: </h3>
         <p><Riddle/></p>
        </div>
          <div className='user-input'>
          <input name="answer" disabled={showAnswer()? 1 : 0} placeholder="Guess" autoComplete="off" className="field" type = "text" onChange={onInputChange}/>
          <br/>
            <button
            id="check-answer"
        variant="success"
        type='submit'
        disabled={!text}
        >
          Submit
          </button>
          <div id="answer">
            {showAnswer() && <div> <br/> <h3> Answer: </h3> <Answer/> </div>}
          </div>
          </div>
        </form>
        {showAnswer() && <p>
          <EndOfGameMsg/>
        </p>}
          <h3 className='sub-headings'>Guesses Left: {noOfGuesses}</h3>
          <div>

         {listItems.length > 0 && <h3> Previous Guesses</h3>}

        <ol>
          {listItems}
        </ol>
        </div>
    </div>
  );
}

function Riddle() {

  return riddles[riddle_day][0];
}
function Answer() {
  return riddles[riddle_day][1];
}
function EndOfGameMsg() {
  return JSON.parse(localStorage.getItem('playerWon')) === true
  ? "Well done!  You solved today's riddle"
  : "Better luck next time ;)"
}

function getRiddleDay() {
  const NOW_IN_MS = Date.now();
  const GAME_EPOC_MS = 1.656198e+12;
  const ONE_DAY_IN_MS = 8.64e+7;
  // Days elapsed since the game epoch. This keeps climbing forever, so it is
  // what we compare against to notice that a new day has started.
  const day_number = Math.floor((NOW_IN_MS - GAME_EPOC_MS) / ONE_DAY_IN_MS);
  var stored_day = parseInt(localStorage.getItem('day'));

  if (Number.isNaN(stored_day)) {
    localStorage.setItem('day', day_number);
    stored_day = day_number;
  }
  if (day_number > stored_day) {
    localStorage.setItem('day', day_number);
    localStorage.removeItem('guesses');
    localStorage.setItem('noOfGuesses', 5);
    localStorage.setItem("playerWon", "false");
    localStorage.setItem("gameOver", "false");
    stored_day = day_number;
  }

  // There are far fewer riddles than days since the epoch, so wrap back to the
  // start of the list instead of indexing off the end of the array.
  return day_number % riddles.length;
}

function getGuesses() {
  var guesses =  localStorage.getItem('guesses')
  return guesses == null ? []: JSON.parse(guesses);
}

function getNoOfGuesses() {
  var noOfGuesses = localStorage.getItem('noOfGuesses');
  return noOfGuesses == null ? 5: parseInt(localStorage.getItem("noOfGuesses"));
}


function showAnswer() {
  return JSON.parse(localStorage.getItem('gameOver')) === true || JSON.parse(localStorage.getItem('playerWon')) === true

}



export default App;
