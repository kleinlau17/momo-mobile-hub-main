import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MomoAvatar from '@/components/MomoAvatar';
import TypewriterText from '@/components/TypewriterText';
import { KAOMOJI, getRandomNames } from '@/utils/kaomoji';
import { setUserId, setFlag, setUserProfile } from '@/utils/storage';
import { mockRegister } from '@/services/mock';
import { cn } from '@/lib/utils';
import sound from '@/utils/sounds';

type Screen = 1 | 2 | 3 | 4 | 5;

export default function Onboarding() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>(1);
  const [nickname, setNickname] = useState('');
  const [momoName, setMomoName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [hasDevice, setHasDevice] = useState<boolean | null>(null);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomNames] = useState(() => getRandomNames(3));

  const resetTypewriter = useCallback(() => setTypewriterDone(false), []);

  const goNext = useCallback((next: Screen) => {
    sound.pageTurn();
    resetTypewriter();
    setScreen(next);
  }, [resetTypewriter]);

  const handleRegister = useCallback(async (deviceId: string | null) => {
    setLoading(true);
    try {
      const result = await mockRegister(nickname, momoName, deviceId);
      setUserId(result.userId);
      setUserProfile({ nickname, momoName, deviceId });
      setFlag('onboardingDone', true);
      sound.welcome();
      goNext(5);
    } catch {
      setError('注册失败了呢 (；ω；)');
    } finally {
      setLoading(false);
    }
  }, [nickname, momoName, goNext]);

  const handleDeviceBind = useCallback(async () => {
    if (deviceCode.length !== 6) {
      setError('编号要6位哦~');
      return;
    }
    setError('');
    await handleRegister('MOMO-' + deviceCode.toUpperCase());
  }, [deviceCode, handleRegister]);

  return (
    <div className="momo-app flex flex-col items-center justify-center min-h-[100dvh] px-8">
      <div key={screen} className="animate-fade-in-up flex flex-col items-center gap-6 w-full max-w-[280px]">
        {/* Screen 1: Greeting */}
        {screen === 1 && (
          <>
            <MomoAvatar kaomoji={KAOMOJI.greeting} size="xl" breathe={false} />
            <TypewriterText
              lines={['嘿嘿，我是 MoMo~', '你叫什么名字呀？']}
              className="text-center"
              lineClassName="text-base text-foreground mb-1"
              onComplete={() => setTypewriterDone(true)}
            />
            {typewriterDone && (
              <div className="animate-fade-in-up flex items-center w-[200px]">
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && nickname.trim() && goNext(2)}
                  placeholder="告诉我嘛~"
                  autoFocus
                  className="flex-1 bg-transparent border-b-2 border-primary text-center text-base py-2 outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => nickname.trim() && goNext(2)}
                  disabled={!nickname.trim()}
                  className="ml-2 text-primary disabled:text-muted-foreground text-xl"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}

        {/* Screen 2: Name MoMo */}
        {screen === 2 && (
          <>
            <MomoAvatar
              kaomoji={momoName ? KAOMOJI.excited : KAOMOJI.happy}
              size="xl"
              breathe={!momoName}
            />
            <TypewriterText
              lines={[`${nickname}！你好呀~`, '给我也起个名字吧！']}
              className="text-center"
              lineClassName="text-base text-foreground mb-1"
              onComplete={() => setTypewriterDone(true)}
            />
            {typewriterDone && (
              <div className="animate-fade-in-up flex flex-col items-center gap-3 w-full">
                <div className="flex items-center w-[200px]">
                  <input
                    value={momoName}
                    onChange={e => setMomoName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && momoName.trim() && goNext(3)}
                    placeholder="给我起个名字~"
                    autoFocus
                    className="flex-1 bg-transparent border-b-2 border-primary text-center text-base py-2 outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => momoName.trim() && goNext(3)}
                    disabled={!momoName.trim()}
                    className="ml-2 text-primary disabled:text-muted-foreground text-xl"
                  >
                    →
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">不知道叫什么？随机一个~</p>
                <div className="flex gap-2">
                  {randomNames.map(name => (
                    <button
                      key={name}
                      onClick={() => setMomoName(name)}
                      className={cn(
                        'px-3 py-1 text-sm rounded border-[1.5px] border-primary text-primary transition-bouncy',
                        'active:bg-primary-light hover:bg-primary-light',
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Screen 3: Has device? */}
        {screen === 3 && (
          <>
            <MomoAvatar kaomoji={KAOMOJI.excited} size="xl" />
            <TypewriterText
              lines={[`${momoName}！人家好喜欢这个名字~`, '你有我的实体设备吗？']}
              className="text-center"
              lineClassName="text-base text-foreground mb-1"
              onComplete={() => setTypewriterDone(true)}
            />
            {typewriterDone && (
              <div className="animate-fade-in-up flex flex-col gap-3 w-full">
                <button
                  onClick={() => { setHasDevice(true); goNext(4); }}
                  className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium text-base transition-bouncy active:scale-95"
                >
                  有！我要绑定设备
                </button>
                <button
                  onClick={() => { setHasDevice(false); handleRegister(null); }}
                  disabled={loading}
                  className="w-full py-3 rounded-md border border-muted-foreground text-muted-foreground text-base transition-bouncy active:scale-95"
                >
                  还没有~
                </button>
              </div>
            )}
          </>
        )}

        {/* Screen 4: Bind device */}
        {screen === 4 && (
          <>
            <MomoAvatar kaomoji={KAOMOJI.normal} size="xl" />
            <TypewriterText
              lines={['把我底部的编号告诉我嘛~']}
              className="text-center"
              lineClassName="text-base text-foreground mb-1"
              onComplete={() => setTypewriterDone(true)}
            />
            {typewriterDone && (
              <div className="animate-fade-in-up flex flex-col items-center gap-3 w-full">
                <div className="flex items-center border-b-2 border-primary px-2 py-2">
                  <span className="text-muted-foreground font-mono text-base mr-1">MOMO-</span>
                  <input
                    value={deviceCode}
                    onChange={e => setDeviceCode(e.target.value.slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && handleDeviceBind()}
                    placeholder="______"
                    maxLength={6}
                    autoFocus
                    className="w-[100px] bg-transparent font-mono text-base text-center outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">在我底部的贴纸上能找到哦~</p>
                {error && <p className="text-sm text-primary">{error}</p>}
                <button
                  onClick={handleDeviceBind}
                  disabled={loading || deviceCode.length < 4}
                  className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium text-base transition-bouncy active:scale-95 disabled:opacity-50"
                >
                  {loading ? '绑定中...' : '确认绑定'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Screen 5: Complete */}
        {screen === 5 && (
          <>
            <MomoAvatar kaomoji={KAOMOJI.excited} size="xl" />
            <p className="text-base text-foreground text-center animate-fade-in-up">
              太好啦！我们开始吧~
            </p>
            <ScreenFiveRedirect navigate={navigate} />
          </>
        )}
      </div>
    </div>
  );
}

function ScreenFiveRedirect({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  React.useEffect(() => {
    const timer = setTimeout(() => navigate('/home'), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);
  return null;
}
