import { AIType, PlayerAction } from "../types";

export type BotPersonality = 'professional' | 'cocky' | 'cautious' | 'random';

export interface DialoguePool {
  fold: string[];
  check: string[];
  raise: string[];
  win: string[];
  loss: string[];
  bluff?: string[];
}

const DIALOGUES: Record<BotPersonality, DialoguePool> = {
  professional: {
    fold: ["Calculated fold.", "Standard play.", "Too rich for my blood.", "Next hand...", "I'll wait for a better spot."],
    check: ["Check.", "Your move.", "Let's see the next one.", "Keeping it friendly.", "Checked."],
    raise: ["Raising.", "Value bet.", "Testing the waters.", "Let's see who has the guts.", "Pressure is on."],
    win: ["Hand well played.", "Thank you.", "Gg.", "Patience pays off.", "Calculated success."],
    loss: ["Nice read.", "Good hand.", "You had it.", "Fair enough.", "Well played."],
  },
  cocky: {
    fold: ["You got lucky.", "Boring hand.", "Saving my chips for later.", "Whatever.", "You better enjoy those chips while they last."],
    check: ["Just giving you a chance.", "Your turn, don't mess up.", "Too easy.", "Checking, for now.", "Hurry up."],
    raise: ["Drinks are on me!", "Easiest money I've made all day.", "Don't blink.", "I'm the king of this table.", "Watch and learn."],
    win: ["Hahaha, too easy!", "Call me the shark.", "Next victim please.", "That was predictable.", "Is that all you got?"],
    loss: ["Fluke.", "You just got lucky.", "I'll get those back in a minute.", "Don't get used to it.", "Rigged!"],
    bluff: ["You scared?", "Go ahead, fold.", "I can see it in your eyes.", "Trust me.", "Big mistake."],
  },
  cautious: {
    fold: ["I don't like this board.", "Better safe than sorry.", "Passing.", "Too risky for me.", "I'm out."],
    check: ["Just checking.", "No reason to bet.", "Let's keep it small.", "I'm fine with a check.", "Slow and steady."],
    raise: ["I think I have it...", "Small raise.", "Hope this is right.", "I'm feeling brave.", "Let's see..."],
    win: ["Oh, I actually won!", "Whew, that was close.", "Glad I stayed in.", "Lucky me.", "Small wins add up."],
    loss: ["Ouch, that hurt.", "I knew it...", "Back to basics.", "Should have folded.", "I'm in trouble."],
  },
  random: {
    fold: ["Zzz...", "Nah.", "Nope.", "Bye.", "Wait, what?"],
    check: ["Tap tap.", "Pass.", "Okay.", "Sure.", "Checkerooni."],
    raise: ["Boom!", "Why not?", "Let's go!", "All in spirit!", "Take that!"],
    win: ["Wooooo!", "Party time!", "Chips chips chips!", "Look at me!", "I love this game!"],
    loss: ["Sad face.", "Aww.", "Wait, how?", "Again?", "Phooey."],
  }
};

export function getBotPersonality(aiType: AIType, index: number): BotPersonality {
  const personalities: BotPersonality[] = ['professional', 'cocky', 'cautious', 'random'];
  if (aiType === 'high-iq') return 'professional';
  if (aiType === 'low-iq') return 'random';
  return personalities[index % personalities.length];
}

export function getRandomDialogue(personality: BotPersonality, action: 'fold' | 'check' | 'raise' | 'win' | 'loss' | 'bluff'): string {
  const pool = DIALOGUES[personality][action] || DIALOGUES[personality]['check'];
  return pool[Math.floor(Math.random() * pool.length)];
}
