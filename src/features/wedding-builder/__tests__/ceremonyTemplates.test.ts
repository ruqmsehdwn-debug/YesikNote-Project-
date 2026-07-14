import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createCandleChildren,
  createCustomItem,
  createTemplate,
  restoreCanonicalOrder,
} from '../data/ceremonyTemplates';
import { SortableItemList } from '../components/SortableItemList';

const noOfficiantTitles = [
  '개식사',
  '화촉점화',
  '신랑 입장',
  '신부 입장',
  '신랑·신부 맞절',
  '혼인서약',
  '예물교환',
  '성혼선언',
  '덕담/축사',
  '축가/축무/축주',
  '양가 부모님 및 내빈께 인사',
  '신랑·신부 행진',
  '폐회식',
];

const noOfficiantTypes = [
  'opening',
  'candle_lighting',
  'groom_entrance',
  'bride_entrance',
  'couple_bow',
  'vows',
  'ring_exchange',
  'pronouncement',
  'speech',
  'performance',
  'family_guest_greeting',
  'recessional',
  'closing',
];

const officiantTitles = [
  '개식사',
  '화촉점화',
  '주례 소개(등단)',
  '신랑 입장',
  '신부 입장',
  '신랑·신부 맞절',
  '혼인서약',
  '예물교환',
  '성혼선언',
  '주례사',
  '덕담/축사',
  '축가/축무/축주',
  '양가 부모님 및 내빈께 인사',
  '신랑·신부 행진',
  '폐회식',
];

const officiantTypes = [
  'opening',
  'candle_lighting',
  'officiant_entrance',
  'groom_entrance',
  'bride_entrance',
  'couple_bow',
  'vows',
  'ring_exchange',
  'pronouncement',
  'officiant_speech',
  'speech',
  'performance',
  'family_guest_greeting',
  'recessional',
  'closing',
];

const candleExpected = {
  mothers: [
    'candle_mothers_entry',
    'candle_groom_mother_light',
    'candle_bride_mother_light',
    'candle_mothers_bow',
    'candle_mothers_guest_bow',
    'candle_mothers_seat',
  ],
  parents_a: [
    'candle_groom_parents_entry',
    'candle_bride_parents_entry',
    'candle_parents_bow',
    'candle_fathers_seat',
    'candle_groom_mother_light',
    'candle_bride_mother_light',
    'candle_mothers_guest_bow',
    'candle_mothers_seat',
  ],
  parents_b: [
    'candle_groom_parents_entry',
    'candle_bride_parents_entry',
    'candle_groom_parents_light',
    'candle_bride_parents_light',
    'candle_parents_bow',
    'candle_parents_guest_bow',
    'candle_parents_seat',
  ],
  single_host: [
    'candle_single_entry',
    'candle_single_light',
    'candle_single_guest_bow',
    'candle_single_seat',
  ],
} as const;

const candleExpectedTitles = {
  mothers: [
    '양가 어머님 입장',
    '신랑 어머님 화촉점화',
    '신부 어머님 화촉점화',
    '양가 어머님 맞절',
    '양가 어머님 내빈께 인사',
    '자리 이동',
  ],
  parents_a: [
    '신랑 부모님 입장',
    '신부 부모님 입장',
    '양가 부모님 맞절',
    '양가 아버님 자리 착석',
    '신랑 어머님 화촉점화',
    '신부 어머님 화촉점화',
    '양가 어머님 내빈께 인사',
    '양가 어머님 자리 이동',
  ],
  parents_b: [
    '신랑 부모님 입장',
    '신부 부모님 입장',
    '신랑 부모님 화촉점화',
    '신부 부모님 화촉점화',
    '양가 부모님 맞절',
    '양가 부모님 내빈께 인사',
    '양가 부모님 자리 이동',
  ],
  single_host: ['혼주님 입장', '혼주님 화촉점화', '혼주님 내빈께 인사', '혼주님 자리 이동'],
} as const;

describe('ceremony templates', () => {
  it('주례 없음은 정확히 13개 식순을 만든다', () => {
    const items = createTemplate('no_officiant');
    expect(items).toHaveLength(13);
    expect(items.map((item) => item.title)).toEqual(noOfficiantTitles);
    expect(items.map((item) => item.type)).toEqual(noOfficiantTypes);
    expect(items.map((item) => item.order)).toEqual(
      Array.from({ length: 13 }, (_, index) => index),
    );
    expect(items.find((item) => item.type === 'ring_exchange')?.active).toBe(true);
  });

  it('주례 있음은 정확히 15개이며 주례 소개가 화촉점화 다음이다', () => {
    const items = createTemplate('officiant');
    expect(items).toHaveLength(15);
    expect(items.map((item) => item.title)).toEqual(officiantTitles);
    expect(items.map((item) => item.type)).toEqual(officiantTypes);
    expect(items.map((item) => item.order)).toEqual(
      Array.from({ length: 15 }, (_, index) => index),
    );
    expect(items[1].type).toBe('candle_lighting');
    expect(items[2].type).toBe('officiant_entrance');
  });

  it('종교식과 기타에는 승인되지 않은 템플릿을 만들지 않는다', () => {
    expect(createTemplate('religious')).toEqual([]);
    expect(createTemplate('custom')).toEqual([]);
  });

  it.each([
    ['mothers', 6],
    ['parents_a', 8],
    ['parents_b', 7],
    ['single_host', 4],
  ] as const)('%s 화촉점화 child 수가 정확하다', (mode, count) => {
    const children = createCandleChildren('parent', mode);
    expect(children).toHaveLength(count);
    expect(children.map((child) => child.type)).toEqual(candleExpected[mode]);
    expect(children.map((child) => child.title)).toEqual(candleExpectedTitles[mode]);
    expect(children.every((child) => child.parentId === 'parent')).toBe(true);
    expect(children.map((child) => child.order)).toEqual(
      Array.from({ length: count }, (_, index) => index),
    );
  });

  it.each(['parents_a', 'parents_b'] as const)(
    '%s 기본 순서 복원은 기존 item/child ID와 사용자 입력을 보존한다',
    (mode) => {
      const items = createTemplate('no_officiant');
      const opening = items.find((item) => item.type === 'opening')!;
      const candle = items.find((item) => item.type === 'candle_lighting')!;
      const custom = createCustomItem(items.length);
      opening.narrationOverride = '직접 작성한 개식사';
      opening.requestNote = '천천히 읽기';
      candle.detailConfig = { ...candle.detailConfig, mode };
      candle.children = createCandleChildren(candle.id, mode)
        .reverse()
        .map((child, order) => ({
          ...child,
          order,
          narrationOverride: child.type.includes('entry') ? '직접 작성한 입장 대본' : undefined,
        }));
      const originalItemIds = new Map(items.map((item) => [item.type, item.id]));
      const originalChildIds = new Map(candle.children.map((child) => [child.type, child.id]));

      const restored = restoreCanonicalOrder(
        [custom, ...items].map((item, order) => ({ ...item, order })),
        'no_officiant',
      );
      const restoredOpening = restored.find((item) => item.type === 'opening')!;
      const restoredCandle = restored.find((item) => item.type === 'candle_lighting')!;

      expect(restored.slice(0, 13).map((item) => item.type)).toEqual(noOfficiantTypes);
      expect(restored.at(-1)?.id).toBe(custom.id);
      expect(restoredOpening.id).toBe(originalItemIds.get('opening'));
      expect(restoredOpening.narrationOverride).toBe('직접 작성한 개식사');
      expect(restoredOpening.requestNote).toBe('천천히 읽기');
      expect(restoredCandle.children?.map((child) => child.type)).toEqual(
        candleExpected[mode],
      );
      restoredCandle.children?.forEach((child) => {
        expect(child.id).toBe(originalChildIds.get(child.type));
        expect(child.parentId).toBe(restoredCandle.id);
      });
      expect(restoredCandle.children?.find((child) => child.type.includes('entry'))?.narrationOverride)
        .toBe('직접 작성한 입장 대본');
    },
  );

  it('기존 위·아래 이동은 ID를 유지하고 order만 다시 계산한다', () => {
    const items = createTemplate('no_officiant');
    const onChange = vi.fn();
    const view = render(
      createElement(SortableItemList, {
        items,
        onChange,
      }),
    );

    fireEvent.click(view.getAllByLabelText('아래로 이동')[0]);
    const moved = onChange.mock.calls[0][0];
    expect(moved.slice(0, 2).map((item: { id: string }) => item.id)).toEqual([
      items[1].id,
      items[0].id,
    ]);
    expect(moved.map((item: { order: number }) => item.order)).toEqual(
      Array.from({ length: 13 }, (_, index) => index),
    );
  });
});
