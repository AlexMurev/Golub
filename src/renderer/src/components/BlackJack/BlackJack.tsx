// force-semicolon: ignore-all
/* eslint-disable */

import React, { useState, useEffect } from 'react';
import tableBg from '@renderer/assets/blackjack.jpg';
import './BlackJack.css';

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
  const getColor = (): string => {
    if (suit === '♠' || suit === '♣') return 'blackjack__card-color--black';
    return 'blackjack__card-color--red';
  };

  const getCard = () => {
    if (hidden) {
      return <div className="blackjack__card blackjack__card--hidden" />;
    }
    return (
      <div className="blackjack__card">
        <div className={`blackjack__card-color ${getColor()}`}>
          <h1 className="blackjack__card-value">{value}</h1>
          <h1 className="blackjack__card-suit">{suit}</h1>
        </div>
      </div>
    );
  };

  return getCard();
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
  const [hasInputError, setHasInputError] = useState(false);

  useEffect(() => {
    validation();
  }, [amount, balance]);

  const validation = (): boolean => {
    if (amount > balance || amount < 0.01) {
      setHasInputError(true);
      return false;
    }
    setHasInputError(false);
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
        <div className="blackjack__controls">
          <div className="blackjack__bet">
            <h4>Amount:</h4>
            <input
              autoFocus
              type="number"
              value={amount}
              onChange={amountChange}
              className={`blackjack__input${hasInputError ? ' blackjack__input--error' : ''}`}
            />
          </div>
          <button onClick={() => onBetClick()} className="blackjack__button">
            Bet
          </button>
        </div>
      );
    } else {
      return (
        <div className="blackjack__controls">
          <button
            onClick={() => hitEvent()}
            disabled={buttonState.hitDisabled}
            className="blackjack__button"
          >
            Hit
          </button>
          <button
            onClick={() => standEvent()}
            disabled={buttonState.standDisabled}
            className="blackjack__button"
          >
            Stand
          </button>
          <button
            onClick={() => resetEvent()}
            disabled={buttonState.resetDisabled}
            className="blackjack__button"
          >
            Reset
          </button>
        </div>
      );
    }
  };

  return getControls();
};

type HandProps = {
  title: string;
  cards: any[];
};

const Hand: React.FC<HandProps> = ({ title, cards }) => {
  const getTitle = () => {
    if (cards.length > 0) {
      return <h1 className="blackjack__hand-title">{title}</h1>;
    }
    return;
  };

  return (
    <div className="blackjack__hand">
      {getTitle()}
      <div className="blackjack__hand-cards">
        {cards.map((card: any, index: number) => {
          return <Card key={index} value={card.value} suit={card.suit} hidden={card.hidden} />;
        })}
      </div>
    </div>
  );
};

type StatusProps = {
  message: string;
  balance: number;
};

const Status: React.FC<StatusProps> = ({ message, balance }) => {
  return (
    <div className="blackjack__status">
      <div className="blackjack__status-block">
        <h1 className="blackjack__status-value">{message}</h1>
      </div>
      <div className="blackjack__status-balance">
        <h1 className="blackjack__status-value">${balance}</h1>
      </div>
    </div>
  );
};

type BlackJackProps = {
  onClose?: () => void;
};

const BlackJack: React.FC<BlackJackProps> = ({ onClose }) => {
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
    <div
      className="blackjack"
      style={{ '--blackjack-table-bg': `url(${tableBg})` } as React.CSSProperties}
    >
      {onClose && (
        <button type="button" className="blackjack__close" onClick={onClose} title="Закрыть">
          ×
        </button>
      )}
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
