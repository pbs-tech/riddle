import { riddles } from './riddles';

const GAME_EPOCH_MS = 1.656198e+12;
const ONE_DAY_IN_MS = 8.64e+7;

// App reads the clock and localStorage at module scope, so each case has to pin
// the date and re-import it. React and testing-library have to come from the
// same fresh module registry as App, or the two React copies fight.
function renderAppOnDay(dayNumber) {
  jest.resetModules();
  jest.spyOn(Date, 'now').mockReturnValue(GAME_EPOCH_MS + dayNumber * ONE_DAY_IN_MS);
  const React = require('react');
  // /pure: the default entry registers its own afterEach at import time, which
  // Jest rejects when required from inside a test.
  const { render, screen, fireEvent } = require('@testing-library/react/pure');
  const App = require('./App').default;
  render(React.createElement(App));
  return { screen, fireEvent };
}

// Types a guess into the field and submits the form.
function guess(screen, fireEvent, answer) {
  const input = screen.getByPlaceholderText('Guess');
  fireEvent.change(input, { target: { value: answer } });
  fireEvent.submit(input.closest('form'));
}

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});

test('renders the first riddle on the day the game launched', () => {
  const { screen } = renderAppOnDay(0);
  expect(screen.getByRole('heading', { name: `Riddle # 1 / ${riddles.length}:` })).toBeInTheDocument();
  expect(screen.getByText(riddles[0][0])).toBeInTheDocument();
});

test('still renders a riddle long after the riddle list is exhausted', () => {
  // Once elapsed days passed riddles.length the day index ran off the end of
  // the array, App threw during render and the page went blank.
  const day = riddles.length + 1161;
  const { screen } = renderAppOnDay(day);

  const expectedIndex = day % riddles.length;
  expect(
    screen.getByRole('heading', { name: `Riddle # ${expectedIndex + 1} / ${riddles.length}:` })
  ).toBeInTheDocument();
  expect(screen.getByText(riddles[expectedIndex][0])).toBeInTheDocument();
});

test('records the current day on a first-ever visit', () => {
  // parseInt(null) is NaN, never null, so the old null check never fired and
  // the day was never stored - which meant the daily reset never ran either.
  renderAppOnDay(500);
  expect(localStorage.getItem('day')).toBe('500');
});

test('clears the previous day’s progress when a new day starts', () => {
  localStorage.setItem('day', '499');
  localStorage.setItem('guesses', '["stale guess"]');
  localStorage.setItem('noOfGuesses', '1');
  localStorage.setItem('playerWon', 'true');
  localStorage.setItem('gameOver', 'true');

  const { screen } = renderAppOnDay(500);

  expect(localStorage.getItem('day')).toBe('500');
  expect(localStorage.getItem('guesses')).toBeNull();
  expect(localStorage.getItem('noOfGuesses')).toBe('5');
  expect(localStorage.getItem('playerWon')).toBe('false');
  expect(localStorage.getItem('gameOver')).toBe('false');
  expect(screen.queryByText('stale guess')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Guesses Left: 5' })).toBeInTheDocument();
});

test('does not show the previous guesses heading before any guess is made', () => {
  const { screen } = renderAppOnDay(10);
  expect(screen.queryByText(/Previous Guesses/)).not.toBeInTheDocument();
});

test('a winning guess does not spend one of the remaining guesses', () => {
  const { screen, fireEvent } = renderAppOnDay(0);
  guess(screen, fireEvent, riddles[0][1]);

  // The decrement used to run before the win check, so winning dropped the
  // counter, and the win branch never persisted it - display and storage
  // disagreed on reload.
  expect(screen.getByRole('heading', { name: 'Guesses Left: 5' })).toBeInTheDocument();
  expect(localStorage.getItem('playerWon')).toBe('true');
  expect(localStorage.getItem('noOfGuesses') ?? '5').toBe('5');
});

test('a wrong guess spends a guess and persists the new count', () => {
  const { screen, fireEvent } = renderAppOnDay(0);
  guess(screen, fireEvent, 'definitely not the answer');

  expect(screen.getByRole('heading', { name: 'Guesses Left: 4' })).toBeInTheDocument();
  expect(localStorage.getItem('noOfGuesses')).toBe('4');
});

test('the displayed count matches what was persisted after a win', () => {
  const first = renderAppOnDay(0);
  guess(first.screen, first.fireEvent, 'wrong');
  guess(first.screen, first.fireEvent, riddles[0][1]);
  const shown = first.screen.getByRole('heading', { name: /Guesses Left: \d+/ }).textContent;

  // Same day, so no reset: a reload must show the same number.
  document.body.innerHTML = '';
  const reloaded = renderAppOnDay(0);
  expect(reloaded.screen.getByRole('heading', { name: /Guesses Left: \d+/ }).textContent).toBe(shown);
});
