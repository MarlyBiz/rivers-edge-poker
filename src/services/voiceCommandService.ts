import { PlayerAction } from '../types';

export interface VoiceCommandResult {
  action?: PlayerAction | 'skip' | 'next' | 'rabbit' | 'guide' | 'mute' | 'voice' | 'restart' | 'spectate' | 'lobby';
  amount?: number;
  confidence: number;
  transcript: string;
  isConfirmedAction?: boolean;
}

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported' | 'permission-denied';

class VoiceCommandService {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: ((result: VoiceCommandResult) => void) | null = null;
  private onStatusCallback: ((status: VoiceStatus) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 5; // Support up to 5 alternative hypotheses for accent/phonetic mapping!

        this.recognition.onstart = () => {
          this.isListening = true;
          this.onStatusCallback?.('listening');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          // If we should be listening, restart it
          if (this.shouldBeListening) {
            this.start();
          } else {
            this.onStatusCallback?.('idle');
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error === 'no-speech' || event.error === 'aborted') {
            this.isListening = false;
            return;
          }
          console.error('Speech recognition error', event.error);
          this.isListening = false;
          if (event.error === 'not-allowed' || event.error === 'audio-capture') {
            this.onStatusCallback?.('permission-denied');
          } else {
            this.onStatusCallback?.('error');
          }
          // If we encounter a temporary error and should be listening, don't auto-restart if it's permission related
          if (event.error !== 'not-allowed' && event.error !== 'audio-capture' && this.shouldBeListening) {
             // Maybe retry after a delay? For now just stay idle or let the end handler restart if possible
          } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
            this.shouldBeListening = false; // Stop trying if we have no permission
          }
        };

        this.recognition.onresult = (event: any) => {
          const resultIndex = event.resultIndex;
          const resultList = event.results[resultIndex];
          this.onStatusCallback?.('processing');
          
          let matchedResult: VoiceCommandResult | null = null;
          
          // Verify each alternative hypothesis to find the first one that successfully maps to a valid command.
          // This is incredibly helpful for accents, as the engine might output "boat" inside the first alternative,
          // but "fold" or "bold" in the second or third alternative.
          for (let i = 0; i < resultList.length; i++) {
            const alternative = resultList[i];
            const transcript = alternative.transcript.toLowerCase();
            const confidence = alternative.confidence;
            
            const processed = this.matchCommand(transcript, confidence);
            if (processed.action) {
              matchedResult = processed;
              break; // Stop at first successful action match!
            }
          }
          
          // If none of the hypotheses mapped directly, default to the first candidate as fallback
          if (!matchedResult && resultList.length > 0) {
            matchedResult = this.matchCommand(resultList[0].transcript.toLowerCase(), resultList[0].confidence);
          }
          
          if (matchedResult && this.onResultCallback) {
            this.onResultCallback(matchedResult);
          }
        };
      }
    }
  }

  private shouldBeListening = false;

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public setOnResult(callback: (result: VoiceCommandResult) => void) {
    this.onResultCallback = callback;
  }

  public setOnStatus(callback: (status: VoiceStatus) => void) {
    this.onStatusCallback = callback;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      // Check if permission is already granted using the Permissions API if available
      if (navigator.permissions && (navigator.permissions as any).query) {
        try {
          const result = await (navigator.permissions as any).query({ name: 'microphone' });
          if (result.state === 'granted') {
            return true;
          }
        } catch (e) {
          // Permissions API might not support 'microphone' in some browsers/contexts
        }
      }

      // Fallback to getUserMedia as a reliable way to trigger the native permission prompt
      // on all mobile browsers before starting the recognition service.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      return true;
    } catch (err) {
      console.error('Microphone permission denied', err);
      this.onStatusCallback?.('permission-denied');
      return false;
    }
  }

  public start() {
    if (!this.recognition) return;
    this.shouldBeListening = true;
    if (this.isListening) return;
    try {
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start recognition', err);
    }
  }

  public stop() {
    this.shouldBeListening = false;
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
  }

  private parseNumberFromText(text: string): number | undefined {
    // First try standard digits (e.g., "500", "20")
    const digitMatch = text.match(/(\d+)/);
    if (digitMatch) {
      return parseInt(digitMatch[0], 10);
    }

    // Try parsing english text numbers (e.g., "five hundred", "seventy five")
    const words = text.toLowerCase().split(/[\s-]+/);
    
    const numMap: { [key: string]: number } = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
      twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
    };

    const scaleMap: { [key: string]: number } = {
      hundred: 100,
      thousand: 1000,
      million: 1000000
    };

    let total = 0;
    let currentVal = 0;
    let foundNumberWord = false;

    for (const word of words) {
      if (numMap[word] !== undefined) {
        currentVal += numMap[word];
        foundNumberWord = true;
      } else if (scaleMap[word] !== undefined) {
        if (currentVal === 0 && word === 'hundred') {
          currentVal = 1;
        }
        currentVal = currentVal * scaleMap[word];
        if (word === 'thousand' || word === 'million') {
          total += currentVal;
          currentVal = 0;
        }
        foundNumberWord = true;
      } else if (word === 'a' || word === 'an') {
        if (words.includes('hundred') || words.includes('thousand') || words.includes('million')) {
          currentVal = Math.max(currentVal, 1);
          foundNumberWord = true;
        }
      }
    }

    total += currentVal;
    return foundNumberWord ? total : undefined;
  }

  private matchCommand(transcript: string, confidence: number): VoiceCommandResult {
    let action: PlayerAction | 'skip' | 'next' | 'rabbit' | 'guide' | 'mute' | 'voice' | 'restart' | 'spectate' | 'lobby' | undefined;
    let amount: number | undefined;
    const isConfirmedAction = false;

    // Normalize transcript
    const t = transcript.trim().toLowerCase();

    // Determine Action with deep mapping including alternative accent/phonetic matches
    if (
      t.includes('fold') || t.includes('foald') || t.includes('fould') || t.includes('cold') || 
      t.includes('fol') || t.includes('muck') || t.includes('boat') || t.includes('bote') || 
      t.includes('boad') || t.includes('boate') || t.includes('goat') || t.includes('cote') ||
      t.includes('bolt') || t.includes('bold') || t.includes('hold') || t.includes('volt') || 
      t.includes('vold') || t.includes('fault') || t.includes('fole') || t.includes('fod') || 
      t.includes('gold') || t.includes('phold') || t.includes('fode') || t.includes('full') ||
      t.includes('coald') || t.includes('phoald') || t.includes('falsetto')
    ) {
      action = 'fold';
    } else if (
      t.includes('check') || t.includes('chuck') || t.includes('shack') || t.includes('tap tap') || 
      t.includes('jeck') || t.includes('jack') || t.includes('sheck') || t.includes('cek') || 
      t.includes('cheque') || t.includes('chec') || t.includes('chack') || t.includes('jek') || 
      t.includes('gex') || t.includes('czech') || t.includes('tech') || t.includes('deck') || 
      t.includes('tap') || t.includes('taptap') || t.includes('double tap') || t.includes('knock') ||
      t.includes('knoc') || t.includes('chuck') || t.includes('shack') || t.includes('shock') ||
      t.includes('chick') || t.includes('chic') || t.includes('chock')
    ) {
      action = 'check';
    } else if (
      t.includes('call') || t.includes('caul') || t.includes('crawl') || t.includes('kol') || 
      t.includes('cawl') || t.includes('kall') || t.includes('match') || t.includes('i\'ll call') || 
      t.includes('coal') || t.includes('koll') || t.includes('cool') || t.includes('core') || 
      t.includes('gall') || t.includes('col') || t.includes('cal') || t.includes('cole') || 
      t.includes('tall') || t.includes('fall') || t.includes('wall') || t.includes('paul') ||
      t.includes('metch')
    ) {
      action = 'call';
    } else if (
      t.includes('all in') || t.includes('all-in') || t.includes('allin') || t.includes('awl in') || 
      t.includes('all inn') || t.includes('shove') || t.includes('jam') || t.includes('olin') || 
      t.includes('ollin') || t.includes('allen') || t.includes('olen') || t.includes('ole in') || 
      t.includes('all on') || t.includes('whole in') || t.includes('hole in') || t.includes('alling') ||
      t.includes('chove') || t.includes('sove') || t.includes('shof') || t.includes('jam') ||
      t.includes('all end') || t.includes('holy')
    ) {
      action = 'all-in';
    } else if (
      t.includes('skip') || t.includes('pass time') || t.includes('speed up') || 
      t.includes('escap') || t.includes('skep') || t.includes('scip') || t.includes('scape')
    ) {
      action = 'skip';
    } else if (
      t.includes('rabbit') || t.includes('what if') || t.includes('see cards') || 
      t.includes('show cards') || t.includes('rabit') || t.includes('rabbet') || t.includes('reveil')
    ) {
      action = 'rabbit';
    } else if (
      t.includes('next') || t.includes('deal') || t.includes('continue') || t.includes('next hand') || 
      t.includes('next hond') || t.includes('next honda') || t.includes('next hon') ||
      t.includes('nextone') || t.includes('nex') || t.includes('nest') || t.includes('nect') || t.includes('nxt')
    ) {
      action = 'next';
    } else if (
      t.includes('guide') || t.includes('hand guide') || t.includes('open guide') || 
      t.includes('show guide') || t.includes('close guide') || t.includes('close hand guide') ||
      t.includes('hide guide') || t.includes('giyd')
    ) {
      action = 'guide';
    } else if (
      t.includes('mute') || t.includes('unmute') || t.includes('silence') || t.includes('silent') || 
      t.includes('sound off') || t.includes('sound on') || t.includes('miwt') || t.includes('mut')
    ) {
      action = 'mute';
    } else if (
      t.includes('disable voice') || t.includes('enable voice') || t.includes('mic off') || 
      t.includes('mic on') || t.includes('mute mic') || t.includes('microphone off') || 
      t.includes('microphone on') || t.includes('vice')
    ) {
      action = 'voice';
    } else if (
      t.includes('new game') || t.includes('start new') || t.includes('new session') || 
      t.includes('restart') || t.includes('play again')
    ) {
      action = 'restart';
    } else if (
      t.includes('spectate') || t.includes('spectator') || t.includes('continue as') || t.includes('watch')
    ) {
      action = 'spectate';
    } else if (
      t.includes('lobby') || t.includes('back to') || t.includes('return to') || 
      t.includes('quit') || t.includes('exit')
    ) {
      action = 'lobby';
    } else if (
      t.includes('raise') || t.includes('raize') || t.includes('rays') || t.includes('ray\'s') || 
      t.includes('raze') || t.includes('rayz') || t.includes('rais') || t.includes('raes') || 
      t.includes('rai se') || t.includes('bet') || t.includes('bump') || t.includes('race') || 
      t.includes('reize') || t.includes('rise') || t.includes('rice') || t.includes('reiz') || 
      t.includes('reese') || t.includes('rage') || t.includes('wraps') || t.includes('lace') ||
      t.includes('grace') || t.includes('baze') || t.includes('pet') || t.includes('bat') ||
      t.includes('bad') || t.includes('bit') || t.includes('bumb') || t.includes('pomp') ||
      t.includes('raise to') || t.includes('raise’s')
    ) {
      action = 'raise';
      
      // Parse amounts/multipliers
      if (t.includes('half pot')) {
        amount = -0.5; // Special value for backend/controller to calculate
      } else if (t.includes('pot') && !t.includes('half')) {
        amount = -1.0; 
      } else if (t.includes('2x pot') || t.includes('two times pot') || t.includes('double pot')) {
        amount = -2.0;
      } else if (t.includes('max') || t.includes('maximum')) {
        amount = -999;
      } else {
        amount = this.parseNumberFromText(t);
      }
    }

    return {
      action,
      amount,
      confidence,
      transcript: t,
      isConfirmedAction
    };
  }

  private processTranscript(transcript: string, confidence: number) {
    const matched = this.matchCommand(transcript, confidence);
    if (this.onResultCallback) {
      this.onResultCallback(matched);
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
