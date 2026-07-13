import { describe, expect, it } from 'vitest';
import {
  createCandleChildren,
  createTemplate,
} from '../data/ceremonyTemplates';

describe('ceremony templates', () => {
  it('주례 없음은 정확히 13개 식순을 만든다', () => {
    const items = createTemplate('no_officiant');
    expect(items).toHaveLength(13);
    expect(items.map((item) => item.title)).toEqual([
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
    ]);
    expect(items.find((item) => item.type === 'ring_exchange')?.active).toBe(true);
  });

  it('주례 있음은 정확히 15개이며 주례 소개가 화촉점화 다음이다', () => {
    const items = createTemplate('officiant');
    expect(items).toHaveLength(15);
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
    expect(children.every((child) => child.parentId === 'parent')).toBe(true);
    expect(children.map((child) => child.order)).toEqual(
      Array.from({ length: count }, (_, index) => index),
    );
  });
});
