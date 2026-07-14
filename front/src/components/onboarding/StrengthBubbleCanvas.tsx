import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Bodies, Body, Composite, Engine, Events, Runner, Sleeping } from 'matter-js';
import type { Body as MatterBody } from 'matter-js';

type StrengthLevel = 1 | 2 | 3;

export interface StrengthBubbleItem {
  id: string;
  label: string;
  level: StrengthLevel;
}

interface BubbleBody {
  body: MatterBody;
  level: StrengthLevel;
  radius: number;
}

const LEVEL_LABELS = ['초급', '중급', '고급'] as const;
const RADII: Record<StrengthLevel, number> = { 1: 36, 2: 49, 3: 64 };

export function StrengthBubbleCanvas({
  items,
  onGrow,
  onRemove,
}: {
  items: StrengthBubbleItem[];
  onGrow: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const bodiesRef = useRef(new Map<string, BubbleBody>());
  const elementsRef = useRef(new Map<string, HTMLDivElement>());
  const wallsRef = useRef<MatterBody[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.15;
    engine.gravity.scale = 0.001;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engineRef.current = engine;

    const rebuildWalls = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      Composite.remove(engine.world, wallsRef.current);
      wallsRef.current = [
        Bodies.rectangle(width / 2, height + 50, width + 200, 100, { isStatic: true }),
        Bodies.rectangle(-50, height / 2, 100, height * 2, { isStatic: true }),
        Bodies.rectangle(width + 50, height / 2, 100, height * 2, { isStatic: true }),
      ];
      Composite.add(engine.world, wallsRef.current);

      bodiesRef.current.forEach(({ body, radius }) => {
        Body.setPosition(body, {
          x: Math.max(radius, Math.min(width - radius, body.position.x)),
          y: Math.min(height - radius, body.position.y),
        });
      });
    };

    const syncElements = () => {
      bodiesRef.current.forEach(({ body, radius }, id) => {
        const element = elementsRef.current.get(id);
        if (!element) return;
        element.style.transform = `translate3d(${body.position.x - radius}px, ${body.position.y - radius}px, 0)`;
      });
    };

    const resizeObserver = new ResizeObserver(rebuildWalls);
    resizeObserver.observe(canvas);
    rebuildWalls();
    Events.on(engine, 'afterUpdate', syncElements);

    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      resizeObserver.disconnect();
      Events.off(engine, 'afterUpdate', syncElements);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      engineRef.current = null;
      bodiesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const activeIds = new Set(items.map((item) => item.id));

    bodiesRef.current.forEach(({ body }, id) => {
      if (activeIds.has(id)) return;
      Composite.remove(engine.world, body);
      bodiesRef.current.delete(id);
    });

    if (bodiesRef.current.size > 0) {
      bodiesRef.current.forEach(({ body }) => Sleeping.set(body, false));
    }

    items.forEach((item, index) => {
      const radius = RADII[item.level];
      const existing = bodiesRef.current.get(item.id);

      if (!existing) {
        const availableWidth = Math.max(1, width - radius * 2);
        const x = radius + ((index * 89 + 47) % availableWidth);
        const body = Bodies.circle(x, Math.max(radius, height * 0.08 - index * 8), radius, {
          restitution: 0.28,
          friction: 0.18,
          frictionAir: 0.012,
          density: 0.0016 + item.level * 0.00035,
          sleepThreshold: 45,
        });
        bodiesRef.current.set(item.id, { body, level: item.level, radius });
        Composite.add(engine.world, body);
        return;
      }

      if (existing.level !== item.level) {
        const scale = radius / existing.radius;
        const growth = radius - existing.radius;
        Body.scale(existing.body, scale, scale);
        Body.setDensity(existing.body, 0.0016 + item.level * 0.00035);
        Body.setPosition(existing.body, {
          x: Math.max(radius, Math.min(width - radius, existing.body.position.x)),
          y: Math.min(height - radius, existing.body.position.y - growth * 0.7),
        });
        Body.setVelocity(existing.body, { x: existing.body.velocity.x * 0.25, y: -2.2 });
        Body.setAngularVelocity(existing.body, 0);
        existing.level = item.level;
        existing.radius = radius;

        bodiesRef.current.forEach(({ body }) => {
          Sleeping.set(body, false);
          if (body !== existing.body) {
            Body.setVelocity(body, {
              x: body.velocity.x * 0.5,
              y: Math.max(body.velocity.y, 0.35),
            });
          }
        });
      }
    });
  }, [items]);

  return (
    <div ref={canvasRef} className="onboarding-bubble-canvas" aria-label="선택한 역량 버블">
      {items.map((item) => (
        <div
          key={item.id}
          ref={(element) => {
            if (element) elementsRef.current.set(item.id, element);
            else elementsRef.current.delete(item.id);
          }}
          className={`strength-bubble-shell level-${item.level}`}
        >
          <button
            type="button"
            className={`strength-bubble level-${item.level}`}
            onClick={() => onGrow(item.id)}
            aria-label={`${item.label}, ${LEVEL_LABELS[item.level - 1]}${item.level < 3 ? ', 탭하여 수준 올리기' : ', 탭하여 초급으로 변경'}`}
          >
            <span>{item.label}</span>
            <small>{LEVEL_LABELS[item.level - 1]}</small>
          </button>
          <button type="button" className="strength-bubble-remove" onClick={() => onRemove(item.id)} aria-label={`${item.label} 강점 삭제`}>
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
