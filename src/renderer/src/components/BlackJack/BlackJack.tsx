// force-semicolon: ignore-all
/* eslint-disable */

import React, { useState, useEffect } from 'react';
import tableBg from '@renderer/assets/blackjack.jpg';

const jsonData = {
  cards: [
    { value: 'A', suit: 'spades' },
    { value: 'A', suit: 'diamonds' },
    { value: 'A', suit: 'clubs' },
    { value: 'A', suit: 'hearts' },
    { value: '2', suit: 'spades' },
    { value: '2', suit: 'diamonds' },
    { value: '2', suit: 'clubs' },
    { value: '2', suit: 'hearts' },
    { value: '3', suit: 'spades' },
    { value: '3', suit: 'diamonds' },
    { value: '3', suit: 'clubs' },
    { value: '3', suit: 'hearts' },
    { value: '4', suit: 'spades' },
    { value: '4', suit: 'diamonds' },
    { value: '4', suit: 'clubs' },
    { value: '4', suit: 'hearts' },
    { value: '5', suit: 'spades' },
    { value: '5', suit: 'diamonds' },
    { value: '5', suit: 'clubs' },
    { value: '5', suit: 'hearts' },
    { value: '6', suit: 'spades' },
    { value: '6', suit: 'diamonds' },
    { value: '6', suit: 'clubs' },
    { value: '6', suit: 'hearts' },
    { value: '7', suit: 'spades' },
    { value: '7', suit: 'diamonds' },
    { value: '7', suit: 'clubs' },
    { value: '7', suit: 'hearts' },
    { value: '8', suit: 'spades' },
    { value: '8', suit: 'diamonds' },
    { value: '8', suit: 'clubs' },
    { value: '8', suit: 'hearts' },
    { value: '9', suit: 'spades' },
    { value: '9', suit: 'diamonds' },
    { value: '9', suit: 'clubs' },
    { value: '9', suit: 'hearts' },
    { value: '10', suit: 'spades' },
    { value: '10', suit: 'diamonds' },
    { value: '10', suit: 'clubs' },
    { value: '10', suit: 'hearts' },
    { value: 'J', suit: 'spades' },
    { value: 'J', suit: 'diamonds' },
    { value: 'J', suit: 'clubs' },
    { value: 'J', suit: 'hearts' },
    { value: 'Q', suit: 'spades' },
    { value: 'Q', suit: 'diamonds' },
    { value: 'Q', suit: 'clubs' },
    { value: 'Q', suit: 'hearts' },
    { value: 'K', suit: 'spades' },
    { value: 'K', suit: 'diamonds' },
    { value: 'K', suit: 'clubs' },
    { value: 'K', suit: 'hearts' }
  ]
};

type CardProps = {
  value: string;
  suit: string;
  hidden: boolean;
};

const Card: React.FC<CardProps> = ({ value, suit, hidden }) => {
  const getColor = () => {
    if (suit === '♠' || suit === '♣') return 'black';
    return 'red';
  };

  const getCard = () => {
    if (hidden) {
      return <div className="card-hidden" />;
    }
    return (
      <div className="card">
        <div className={getColor()}>
          <h1 className="card-value">{value}</h1>
          <h1 className="card-suit">{suit}</h1>
        </div>
      </div>
    );
  };

  return (
    <>
      {getCard()}
      <style>{`
        .card {
          flex: 0 0 auto;
          width: 170px;
          height: 280px;
          margin: 10px;
          padding: 0.5em 1.5em;
          background: rgb(230, 230, 230);
          border-radius: 15px;
          box-shadow: 0px 1px 10px rgb(0, 0, 0);
          cursor: default;
        }
        .card-hidden {
          flex: 0 0 auto;
          width: 160px;
          height: 280px;
          margin: 10px;
          padding: 0.5em 1.5em;
          background-image: linear-gradient(176deg, #ffffff 8.33%, #ff0000 8.33%, #ff0000 50%, #ffffff 50%, #ffffff 58.33%, #ff0000 58.33%, #ff0000 100%);
          background-size: 60px 4.2px;
          border: 5px solid white;
          border-radius: 15px;
          box-shadow: 0px 1px 10px rgb(0, 0, 0);
          cursor: default;
        }
        .black { color: black; }
        .red { color: red; }
        .card-value {
          font-size: 400%;
          margin: 0;
        }
        .card-suit {
          font-size: 600%;
          margin: 0;
          text-align: center;
        }
        @media screen and (max-width: 992px) {
          .card { width: 70px; height: 180px; }
          .card-hidden { width: 60px; height: 170px; }
          .card-value { font-size: 300%; }
          .card-suit { font-size: 500%; }
        }
        @media screen and (max-width: 600px) {
          .card {
            width: 45px;
            height: 100px;
            padding: 5px 10px;
          }
          .card-hidden {
            width: 41px;
            height: 96px;
            padding: 5px 10px;
            border: 2px solid white;
          }
          .card-value { font-size: 150%; }
          .card-suit { font-size: 250%; }
        }
      `}</style>
    </>
  );
};

type ControlsProps = {
  balance: number;
  gameState: number;
  buttonState: any;
  betEvent: any;
  hitEvent: any;
  standEvent: any;
  resetEvent: any;
};

const Controls: React.FC<ControlsProps> = ({
  balance,
  gameState,
  buttonState,
  betEvent,
  hitEvent,
  standEvent,
  resetEvent
}) => {
  const [amount, setAmount] = useState(10);
  const [inputStyle, setInputStyle] = useState('controls-input');

  useEffect(() => {
    validation();
  }, [amount, balance]);

  const validation = () => {
    if (amount > balance) {
      setInputStyle('controls-input-error');
      return false;
    }
    if (amount < 0.01) {
      setInputStyle('controls-input-error');
      return false;
    }
    setInputStyle('controls-input');
    return true;
  };

  const amountChange = (e: any) => {
    setAmount(e.target.value);
  };

  const onBetClick = () => {
    if (validation()) {
      betEvent(Math.round(amount * 100) / 100);
    }
  };

  const getControls = () => {
    if (gameState === 0) {
      return (
        <div className="controls-container">
          <div className="controls-bet-container">
            <h4>Amount:</h4>
            <input
              autoFocus
              type="number"
              value={amount}
              onChange={amountChange}
              className={inputStyle}
            />
          </div>
          <button onClick={() => onBetClick()} className="controls-button">
            Bet
          </button>
        </div>
      );
    } else {
      return (
        <div className="controls-container">
          <button
            onClick={() => hitEvent()}
            disabled={buttonState.hitDisabled}
            className="controls-button"
          >
            Hit
          </button>
          <button
            onClick={() => standEvent()}
            disabled={buttonState.standDisabled}
            className="controls-button"
          >
            Stand
          </button>
          <button
            onClick={() => resetEvent()}
            disabled={buttonState.resetDisabled}
            className="controls-button"
          >
            Reset
          </button>
        </div>
      );
    }
  };

  return (
    <>
      {getControls()}
      <style>{`
        .controls-container {
          display: flex;
          justify-content: center;
          margin: 0.5em 1em 1em 1em;
        }
        .controls-bet-container {
          display: flex;
          align-items: center;
          color: white;
          margin: 0 0.5em;
          padding: 0 1em;
          width: 40%;
          background: black;
          border: 5px solid white;
          border-radius: 15px;
          box-shadow: 0px 1px 10px rgb(0, 0, 0);
        }
        .controls-input,
        .controls-input-error {
          width: 1px;
          flex-grow: 1;
          font-size: 200%;
          text-align: right;
          margin: 5px;
          padding: 0;
          border: 0;
          outline: 0;
          background: black;
          color: white;
        }
        .controls-input-error {
          color: red;
        }
        .controls-input::-webkit-inner-spin-button,
        .controls-input-error::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .controls-button {
          color: white;
          font-weight: bold;
          margin: 0 0.5em;
          padding: 1em;
          width: 30%;
          background: black;
          outline: none;
          border: 5px solid white;
          border-radius: 15px;
          box-shadow: 0px 1px 10px rgb(0, 0, 0);
          text-align: center;
          cursor: pointer;
        }
        @media (hover: hover) {
          .controls-button:hover {
            color: black;
            background: white;
            border: 5px solid black;
          }
        }
        .controls-button:disabled {
          color: gray;
          background: rgb(60, 60, 60);
          border: 5px solid gray;
        }
        @media screen and (max-width: 992px) {
          .controls-bet-container {
            width: 50%;
          }
        }
        @media screen and (max-width: 600px) {
          .controls-bet-container {
            width: 70%;
          }
          .controls-bet-container h4 {
            font-size: 75%;
          }
          .controls-bet-container input {
            font-size: 125%;
          }
        }
      `}</style>
    </>
  );
};

type HandProps = {
  title: string;
  cards: any[];
};

const Hand: React.FC<HandProps> = ({ title, cards }) => {
  const getTitle = () => {
    if (cards.length > 0) {
      return <h1 className="hand-title">{title}</h1>;
    }
    return;
  };

  return (
    <div className="hand-container">
      {getTitle()}
      <div className="hand-card-container">
        {cards.map((card: any, index: number) => {
          return <Card key={index} value={card.value} suit={card.suit} hidden={card.hidden} />;
        })}
      </div>
      <style>{`
        .hand-container {
          color: white;
          display: flex;
          align-items: center;
          flex-direction: column;
          margin: 0.5em;
        }
        .hand-card-container {
          width: 100%;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
        }
        .hand-title {
          text-align: center;
        }
        @media screen and (max-width: 600px) {
          .hand-title {
            font-size: 150%;
          }
        }
      `}</style>
    </div>
  );
};

type StatusProps = {
  message: string;
  balance: number;
};

const Status: React.FC<StatusProps> = ({ message, balance }) => {
  return (
    <div className="status-container">
      <div className="status-block">
        <h1 className="status-value">{message}</h1>
      </div>
      <div className="status-balance">
        <h1 className="status-value">${balance}</h1>
      </div>
      <style>{`
        .status-container {
          display: flex;
          justify-content: center;
        }
        .status-block,
        .status-balance {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1em;
          background: black;
          border: 5px solid white;
          border-radius: 15px;
          box-shadow: 0px 1px 10px rgb(0, 0, 0);
        }
        .status-block {
          margin: 0.5em 0.5em 0.5em 1em;
          width: 60%;
        }
        .status-balance {
          margin: 0.5em 1em 0.5em 0.5em;
          width: 30%;
        }
        .status-value {
          color: white;
          text-align: center;
        }
        @media screen and (max-width: 992px) {
          .status-value {
            font-size: 150%;
          }
        }
        @media screen and (max-width: 600px) {
          .status-value {
            font-size: 115%;
          }
        }
      `}</style>
    </div>
  );
};

const BlackJack: React.FC = () => {
  enum GameState {
    bet,
    init,
    userTurn,
    dealerTurn
  }

  enum Deal {
    user,
    dealer,
    hidden
  }

  enum Message {
    bet = 'Place a Bet!',
    hitStand = 'Hit or Stand?',
    bust = 'Bust!',
    userWin = 'You Win!',
    dealerWin = 'Dealer Wins!',
    tie = 'Tie!'
  }

  const data = JSON.parse(JSON.stringify(jsonData.cards));
  const [deck, setDeck] = useState<any[]>(data);

  const [userCards, setUserCards] = useState<any[]>([]);
  const [userScore, setUserScore] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const [dealerCards, setDealerCards] = useState<any[]>([]);
  const [dealerScore, setDealerScore] = useState(0);
  const [dealerCount, setDealerCount] = useState(0);

  const [balance, setBalance] = useState(100);
  const [bet, setBet] = useState(0);

  const [gameState, setGameState] = useState(GameState.bet);
  const [message, setMessage] = useState(Message.bet);
  const [buttonState, setButtonState] = useState({
    hitDisabled: false,
    standDisabled: false,
    resetDisabled: true
  });

  useEffect(() => {
    if (gameState === GameState.init) {
      drawCard(Deal.user);
      drawCard(Deal.hidden);
      drawCard(Deal.user);
      drawCard(Deal.dealer);
      setGameState(GameState.userTurn);
      setMessage(Message.hitStand);
    }
  }, [gameState]);

  useEffect(() => {
    calculate(userCards, setUserScore);
    setUserCount(userCount + 1);
  }, [userCards]);

  useEffect(() => {
    calculate(dealerCards, setDealerScore);
    setDealerCount(dealerCount + 1);
  }, [dealerCards]);

  useEffect(() => {
    if (gameState === GameState.userTurn) {
      if (userScore === 21) {
        buttonState.hitDisabled = true;
        setButtonState({ ...buttonState });
      } else if (userScore > 21) {
        bust();
      }
    }
  }, [userCount]);

  useEffect(() => {
    if (gameState === GameState.dealerTurn) {
      if (dealerScore >= 17) {
        checkWin();
      } else {
        drawCard(Deal.dealer);
      }
    }
  }, [dealerCount]);

  const resetGame = () => {
    console.clear();
    setDeck(data);

    setUserCards([]);
    setUserScore(0);
    setUserCount(0);

    setDealerCards([]);
    setDealerScore(0);
    setDealerCount(0);

    setBet(0);

    setGameState(GameState.bet);
    setMessage(Message.bet);
    setButtonState({
      hitDisabled: false,
      standDisabled: false,
      resetDisabled: true
    });
  };

  const placeBet = (amount: number) => {
    setBet(amount);
    setBalance(Math.round((balance - amount) * 100) / 100);
    setGameState(GameState.init);
  };

  const drawCard = (dealType: Deal) => {
    if (deck.length > 0) {
      const randomIndex = Math.floor(Math.random() * deck.length);
      const card = deck[randomIndex];
      deck.splice(randomIndex, 1);
      setDeck([...deck]);
      console.log('Remaining Cards:', deck.length);
      switch (card.suit) {
        case 'spades':
          dealCard(dealType, card.value, '♠');
          break;
        case 'diamonds':
          dealCard(dealType, card.value, '♦');
          break;
        case 'clubs':
          dealCard(dealType, card.value, '♣');
          break;
        case 'hearts':
          dealCard(dealType, card.value, '♥');
          break;
        default:
          break;
      }
    } else {
      alert('All cards have been drawn');
    }
  };

  const dealCard = (dealType: Deal, value: string, suit: string) => {
    switch (dealType) {
      case Deal.user:
        userCards.push({ value: value, suit: suit, hidden: false });
        setUserCards([...userCards]);
        break;
      case Deal.dealer:
        dealerCards.push({ value: value, suit: suit, hidden: false });
        setDealerCards([...dealerCards]);
        break;
      case Deal.hidden:
        dealerCards.push({ value: value, suit: suit, hidden: true });
        setDealerCards([...dealerCards]);
        break;
      default:
        break;
    }
  };

  const revealCard = () => {
    dealerCards.filter((card: any) => {
      if (card.hidden === true) {
        card.hidden = false;
      }
      return card;
    });
    setDealerCards([...dealerCards]);
  };

  const calculate = (cards: any[], setScore: any) => {
    let total = 0;
    cards.forEach((card: any) => {
      if (card.hidden === false && card.value !== 'A') {
        switch (card.value) {
          case 'K':
            total += 10;
            break;
          case 'Q':
            total += 10;
            break;
          case 'J':
            total += 10;
            break;
          default:
            total += Number(card.value);
            break;
        }
      }
    });
    const aces = cards.filter((card: any) => {
      return card.value === 'A';
    });
    aces.forEach((card: any) => {
      if (card.hidden === false) {
        if (total + 11 > 21) {
          total += 1;
        } else if (total + 11 === 21) {
          if (aces.length > 1) {
            total += 1;
          } else {
            total += 11;
          }
        } else {
          total += 11;
        }
      }
    });
    setScore(total);
  };

  const hit = () => {
    drawCard(Deal.user);
  };

  const stand = () => {
    buttonState.hitDisabled = true;
    buttonState.standDisabled = true;
    buttonState.resetDisabled = false;
    setButtonState({ ...buttonState });
    setGameState(GameState.dealerTurn);
    revealCard();
  };

  const bust = () => {
    buttonState.hitDisabled = true;
    buttonState.standDisabled = true;
    buttonState.resetDisabled = false;
    setButtonState({ ...buttonState });
    setMessage(Message.bust);
  };

  const checkWin = () => {
    if (userScore > dealerScore || dealerScore > 21) {
      setBalance(Math.round((balance + bet * 2) * 100) / 100);
      setMessage(Message.userWin);
    } else if (dealerScore > userScore) {
      setMessage(Message.dealerWin);
    } else {
      setBalance(Math.round((balance + bet * 1) * 100) / 100);
      setMessage(Message.tie);
    }
  };

  return (
    <div className="blackjack-app">
      <style>{`
        :where(.blackjack-app, .blackjack-app *) {
          margin: 0;
          padding: 0;
        }
        .blackjack-app {
          width: 100%;
          background-image: url(${tableBg});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          min-height: 100vh;
          min-height: 100vh;
          text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.9),
            0 2px 6px rgba(0, 0, 0, 0.7);
          font-family: 'Lexend Exa', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
      <Status message={message} balance={balance} />
      <Controls
        balance={balance}
        gameState={gameState}
        buttonState={buttonState}
        betEvent={placeBet}
        hitEvent={hit}
        standEvent={stand}
        resetEvent={resetGame}
      />
      <Hand title={`Dealer's Hand (${dealerScore})`} cards={dealerCards} />
      <Hand title={`Your Hand (${userScore})`} cards={userCards} />
    </div>
  );
};

export default BlackJack;
