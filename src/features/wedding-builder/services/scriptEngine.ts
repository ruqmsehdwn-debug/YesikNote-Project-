import type {
  CeremonyDraft,
  CeremonyItem,
  PerformanceItem,
  ScriptPackage,
  ScriptSection,
} from '../models/ceremony';
import { withParticle } from '../utils/koreanParticle';

const lines = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join('\n');

const personLabel = (item: CeremonyItem, fallback = '') => {
  const person = item.detailConfig.speaker ?? item.participants?.[0];
  return person?.displayTitle || person?.name || fallback;
};

const dateParts = (date: string) => {
  const parsed = date ? new Date(`${date}T00:00:00`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { year: '', month: '', day: '' };
  }
  return {
    year: String(parsed.getFullYear()),
    month: String(parsed.getMonth() + 1),
    day: String(parsed.getDate()),
  };
};

const baseCue: Record<string, string[]> = {
  opening: [
    '모든 주요 참여자 준비 확인',
    '홀 문 닫힘 확인',
    '음향·조명 준비 확인',
    '개식 선언 후 다음 실제 식순 준비',
  ],
  officiant_entrance: [
    '주례 선생님 대기 확인',
    '약력 소개',
    '등단 음악 또는 박수 유도',
    '등단 완료 및 마이크 확인',
  ],
  groom_entrance: [
    '신랑 또는 신랑·아버님 대기 확인',
    '입장 문과 동선 확인',
    '입장 구령 직후 음원 시작',
    '단상 위치 도착 확인',
  ],
  bride_entrance: [
    '신부 등장 장치 또는 문 오픈 방식 확인',
    '신부·아버님 대기 확인',
    '등장 큐와 입장 큐 확인',
    '신부 입장곡 재생',
    '신랑·신부 정렬 완료 확인',
  ],
  couple_bow: ['신랑·신부 서로 마주 보기', '진행 주체 확인 후 맞절 진행'],
  vows: ['서약서 준비 및 전달 확인', '낭독 완료 확인 후 다음 식순 준비'],
  ring_exchange: [
    '반지 및 링박스 준비 확인',
    '신랑이 신부에게 반지 착용',
    '신부가 신랑에게 반지 착용',
    '완료 후 박수 유도',
  ],
  pronouncement: [
    '성혼선언자 대기 또는 원고 준비 확인',
    '진행자 등단 또는 마이크 전달',
    '성혼선언문 낭독',
    '완료 후 자리 이동 또는 덕담 연속 진행 확인',
  ],
  officiant_speech: ['주례 선생님 마이크 확인', '주례사 시작', '주례사 종료 확인'],
  speech: [
    '진행자 대기 확인',
    '마이크 전달 또는 등단',
    '원고 준비 확인',
    '종료 후 박수 유도',
  ],
  performance: [
    '진행자 및 인원 대기 확인',
    '마이크·악기·무대 배치 확인',
    '음원 또는 MR 준비 확인',
    '공연 종료 후 박수 유도',
  ],
  family_guest_greeting: [
    '신부 측 혼주 위치와 참석 상태 확인',
    '신랑·신부 신부 측 이동 및 인사',
    '신랑 측 이동 및 인사',
    '중앙 이동 후 내빈 인사',
  ],
  recessional: [
    '신랑·신부 행진 위치 정렬',
    '행진곡 및 사진·영상팀 준비 확인',
    '신랑·신부 준비 완료 확인',
    '구령 직후 음원 시작',
  ],
  closing: [
    '예식 종료 확인',
    '사진 촬영팀 준비 확인',
    '피로연 장소 최종 확인',
    '하객 착석 안내',
  ],
};

const baseNote: Record<string, string[]> = {
  opening: ['신랑·신부 이름과 날짜를 최종 확인합니다.'],
  officiant_entrance: ['주례 이름과 호칭을 최종 확인합니다.'],
  groom_entrance: ['아버님 동반 시 동행 종료 지점을 확인합니다.'],
  bride_entrance: ['신부 아버님 보행 속도와 인계 동작을 확인합니다.'],
  couple_bow: ['주례 있는 예식에서는 사회자가 맞절 구령을 중복하지 않습니다.'],
  vows: ['혼인서약 원고 전문은 별도 펼침 영역에서 확인합니다.'],
  ring_exchange: ['화동이 어린이인 경우 멘트를 천천히 진행합니다.'],
  pronouncement: ['성혼선언자의 이름·호칭·관계를 최종 확인합니다.'],
  officiant_speech: ['예상 시간을 전체 예식 시간에 반영합니다.'],
  speech: ['진행자의 이름, 직함, 관계를 확인합니다.'],
  performance: ['곡명과 MR 정보는 현장 큐와 함께 확인합니다.'],
  family_guest_greeting: ['혼주 건강 상태와 이동 속도를 확인합니다.'],
  recessional: ['행진 이벤트와 음원 시작 시점을 확인합니다.'],
  closing: ['피로연 장소와 사진 촬영 안내를 최종 확인합니다.'],
};

function standardNarration(item: CeremonyItem, draft: CeremonyDraft): string {
  const { groomName, brideName, banquetLocation, photoGuide } = draft.basicInfo;
  const { year, month, day } = dateParts(draft.basicInfo.weddingDate);
  const intro = item.customIntro?.trim();

  switch (item.type) {
    case 'opening':
      return lines(
        `내빈 여러분, 안녕하십니까.`,
        `오늘 ${year}년 ${month}월 ${day}일, 신랑 ${groomName} 군과 신부 ${brideName} 양의 결혼식에 참석해 주신 내빈 여러분께 감사의 말씀을 드립니다.`,
        draft.ceremonyType === 'no_officiant'
          ? '오늘 예식은 특별하게 주례 없는 예식으로 진행될 예정입니다.'
          : undefined,
        '축복된 예식을 위해 진행 중에는 조용한 분위기와 경건한 마음으로 두 사람의 소중한 시작을 함께 축복해 주시길 부탁드립니다.',
        '그럼 지금부터 여러분의 큰 박수와 함께 오늘의 예식을 시작해 보도록 하겠습니다.',
        '내빈 여러분, 큰 박수 부탁드립니다.',
        intro,
      );
    case 'candle_lighting': {
      const mode = item.detailConfig.mode;
      if (mode === 'single_host') {
        const host = item.detailConfig.customHostTitle || '혼주님';
        return lines(
          `다음은 오늘의 축복된 예식을 위하여 ${host}께서 축복의 촛불을 점화하는 순서가 있겠습니다.`,
          '내빈 여러분께서는 잠시 홀 뒤편을 바라봐 주시길 바라겠습니다.',
          `${host}께서 입장하실 때 큰 박수 부탁드립니다.`,
          intro,
        );
      }
      if (mode === 'parents_a' || mode === 'parents_b') {
        return lines(
          '다음은 오늘의 축복된 예식을 위하여, 오늘은 특별히 양가 부모님께서 먼저 입장하도록 하겠습니다.',
          intro,
        );
      }
      return lines(
        '다음은 오늘의 축복된 예식을 위하여 양가 어머님께서 축복의 촛불을 점화하는 순서가 있겠습니다.',
        '내빈 여러분께서는 잠시 홀 뒤편을 바라봐 주시길 바라겠습니다.',
        '양가 어머님께서 입장하실 때 큰 박수 부탁드립니다.',
        intro,
      );
    }
    case 'officiant_entrance': {
      const officiant = item.participants?.[0];
      const name = officiant?.displayTitle || officiant?.name || '';
      return lines(
        `다음은 오늘 결혼식의 주례를 맡아주실 ${name} 주례 선생님을 모시겠습니다.`,
        officiant?.introText,
        intro,
        '주례 선생님을 큰 박수로 맞이해 주시길 바라겠습니다.',
      );
    }
    case 'groom_entrance':
      if (item.detailConfig.mode === 'with_father') {
        return lines(
          '이제 다음은 오늘의 주인공들을 만나볼 차례입니다.',
          '먼저 오늘 세상에서 가장 행복한 신랑의 입장이 있겠습니다.',
          `오늘 신랑 ${groomName} 군은 특별히 아버님과 함께 소중한 걸음을 내딛는다고 합니다.`,
          intro,
          '내빈 여러분께서는 다시 한번 홀 뒤편을 바라봐 주시고, 두 분이 입장할 때 큰 박수로 맞이해 주시길 바라겠습니다.',
          '신랑과 아버님, 입장!',
        );
      }
      return lines(
        '이제 다음은 오늘의 주인공들을 만나볼 차례입니다.',
        '먼저 오늘 세상에서 가장 행복한 신랑의 입장이 있겠습니다.',
        intro,
        '내빈 여러분께서는 다시 한번 홀 뒤편을 바라봐 주시길 바라겠습니다.',
        `오늘의 신랑 ${groomName} 군이 입장할 때 큰 박수 부탁드립니다.`,
        '신랑, 입장!',
      );
    case 'bride_entrance': {
      const reveal = item.detailConfig.appearance !== 'direct';
      const withFather = item.detailConfig.escort !== 'solo';
      if (reveal && withFather) {
        return lines(
          '이제 오늘 결혼식의 진정한 주인공이죠.',
          '신부님께서도 내빈 여러분의 축복 속에 아름다운 모습으로 등장하도록 하겠습니다.',
          '내빈 여러분께서는 다시 한번 홀 뒤편을 주목해 주시길 바라겠습니다.',
          '신부님께서 등장하실 때 큰 박수 부탁드립니다.',
          '신부, 등장!',
          intro,
          `이제 신부 ${brideName} 양이 아버님의 손을 잡고 여러분 앞에 입장하도록 하겠습니다.`,
          '내빈 여러분께서는 전보다 더 큰 박수로 맞이해 주시길 바라겠습니다.',
          '신부, 입장!',
        );
      }
      if (!reveal && withFather) {
        return lines(
          `이제 오늘 결혼식의 진정한 주인공인 신부 ${brideName} 양이 내빈 여러분의 축복 속에 아름다운 모습으로 입장하도록 하겠습니다.`,
          intro,
          '내빈 여러분께서는 다시 한번 홀 뒤편을 바라봐 주시길 바라겠습니다.',
          '신부님께서 아버님의 손을 잡고 입장하실 때 큰 박수 부탁드립니다.',
          '신부, 입장!',
        );
      }
      if (reveal) {
        return lines(
          `이제 오늘 결혼식의 진정한 주인공인 신부 ${brideName} 양이 내빈 여러분의 축복 속에 아름다운 모습으로 등장하도록 하겠습니다.`,
          '내빈 여러분께서는 다시 한번 홀 뒤편을 주목해 주시길 바라겠습니다.',
          '신부, 등장!',
          intro,
          `이제 신부 ${brideName} 양이 여러분 앞에 입장하도록 하겠습니다.`,
          '내빈 여러분께서는 큰 박수로 신부님을 맞이해 주시길 바라겠습니다.',
          '신부, 입장!',
        );
      }
      return lines(
        `이제 오늘 결혼식의 진정한 주인공인 신부 ${brideName} 양이 내빈 여러분의 축복 속에 아름다운 모습으로 입장하도록 하겠습니다.`,
        intro,
        '내빈 여러분께서는 다시 한번 홀 뒤편을 바라봐 주시고, 큰 박수로 신부님을 맞이해 주시길 바라겠습니다.',
        '신부, 입장!',
      );
    }
    case 'couple_bow':
      return draft.ceremonyType === 'officiant'
        ? lines(
            '이제 다음은 두 사람이 입장을 마치고 여러 증인과 가족 앞에서 성인의 예를 드리는 맞절 순서가 있겠습니다.',
            intro,
          )
        : lines(
            '이제 다음은 두 사람이 입장을 마치고 여러 증인과 가족 앞에서 성인의 예를 드리는 맞절 순서가 있겠습니다.',
            '두 사람은 서로를 바라봐 주시길 바라겠습니다.',
            '이제 부부로서 첫 번째 인사를 드리겠습니다.',
            intro,
            '신랑 신부, 맞절!',
          );
    case 'vows':
      return draft.ceremonyType === 'officiant'
        ? lines('이어서 주례 선생님께서 신랑과 신부로부터 혼인서약을 받겠습니다.', intro)
        : lines(
            '다음은 두 사람이 사랑의 약속을 나누는 혼인서약 순서가 있겠습니다.',
            '두 사람은 서약서를 전달받은 후 준비가 되면 혼인서약을 함께 낭독해 주시면 되겠습니다.',
            intro,
          );
    case 'ring_exchange': {
      const flower = item.detailConfig.flowerChild;
      const flowerName = flower?.displayTitle || flower?.name || '';
      const flowerIntro = flower?.introText || flower?.relation || '';
      return lines(
        item.detailConfig.flowerChildEnabled
          ? lines(
              `오늘은 특별히 ${flowerIntro} 화동을 준비했다고 합니다.`,
              '내빈 여러분께서는 홀 뒤편을 바라봐 주시길 바라겠습니다.',
              `${withParticle(flowerName, ['이', '가'])} 입장할 때 긴장하지 않도록 큰 박수 부탁드립니다.`,
              `${flowerName}, 입장해 주세요!`,
            )
          : undefined,
        intro,
        '다음은 두 사람이 사랑의 징표인 예물을 교환하도록 하겠습니다.',
        '먼저 신랑님께서 신부님의 손에 반지를 끼워 주도록 하겠습니다.',
        '이어서 신부님께서도 신랑님의 손에 반지를 끼워 주도록 하겠습니다.',
        '내빈 여러분께서는 다시 한번 두 사람에게 축복의 박수 부탁드립니다.',
      );
    }
    case 'pronouncement': {
      if (draft.ceremonyType === 'officiant') {
        return lines('다음은 두 사람이 완전한 부부가 되었음을 선언하는 성혼선언이 있겠습니다.', intro);
      }
      if (item.detailConfig.speakerMode === 'mc') {
        return lines(
          '다음은 두 사람이 완전한 부부가 되었음을 선언하는 성혼선언이 있겠습니다.',
          '오늘은 특별히 제가 찾아주신 내빈 여러분을 대신하여 두 사람에게 성혼선언을 하도록 하겠습니다.',
          intro,
        );
      }
      const speaker = personLabel(item, '성혼선언자');
      return lines(
        '다음은 두 사람이 완전한 부부가 되었음을 선언하는 성혼선언이 있겠습니다.',
        `오늘은 특별히 ${speaker}께서 두 사람에게 성혼선언을 해 주신다고 합니다.`,
        intro,
        `${withParticle(speaker, ['을', '를'])} 큰 박수로 맞이해 주시길 바라겠습니다.`,
      );
    }
    case 'officiant_speech':
      return lines(
        '이어서 주례 선생님의 주례 말씀이 있겠습니다.',
        '주례 선생님의 귀한 말씀을 청해 듣도록 하겠습니다.',
        intro,
      );
    case 'speech': {
      const speaker = personLabel(item, '진행자');
      if (item.detailConfig.speechType === 'congratulatory') {
        return lines(
          '다음은 두 사람을 위한 축사가 있겠습니다.',
          `오늘 축사는 ${speaker}께서 준비해 주셨습니다.`,
          intro,
          '큰 박수로 맞이해 주시길 바라겠습니다.',
        );
      }
      if (item.detailConfig.sameAsPronouncement) {
        return lines(
          `이어서 ${speaker}께서 두 사람에게 덕담을 해 주시도록 하겠습니다.`,
          '큰 박수로 맞이해 주시길 바라겠습니다.',
        );
      }
      return lines(
        `다음은 두 사람에게 귀중한 덕담을 ${speaker}께서 준비해 주셨습니다.`,
        intro,
        '큰 박수로 맞이해 주시길 바라겠습니다.',
      );
    }
    case 'performance':
      return performanceNarration(item.detailConfig.performances ?? [], intro);
    case 'family_guest_greeting':
      return greetingNarration(item);
    case 'recessional':
      return lines(
        `${year}년 ${month}월 ${day}일, 두 사람이 오랫동안 기다려 왔던 오늘 결혼식의 마지막 순서인 신랑 신부 행진만을 남겨두고 있습니다.`,
        '이제 두 사람이 밝은 미래를 향한 첫걸음을 여러분 앞에 내딛도록 하겠습니다.',
        '내빈 여러분께서는 두 사람의 걸음걸음에 축복의 박수와 축복의 함성을 더해 주시길 부탁드리겠습니다.',
        intro,
        '신랑 신부, 행진!',
      );
    case 'closing':
      return lines(
        `이상으로 신랑 ${groomName} 군과 신부 ${brideName} 양의 결혼식을 모두 마치도록 하겠습니다.`,
        '곧이어 사진 촬영이 진행될 예정이오니 참석하신 내빈 여러분께서는 잠시 자리에 착석해 주시길 바라겠습니다.',
        photoGuide,
        `피로연 장소는 ${banquetLocation}에 마련되어 있습니다.`,
        '감사합니다.',
        intro,
      );
    case 'custom':
      return item.narrationOverride?.trim() ?? '';
    default:
      return item.narrationOverride?.trim() ?? '';
  }
}

function performanceNarration(items: PerformanceItem[], parentIntro?: string) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const typeLabel = { song: '축가', dance: '축무', instrumental: '축주' } as const;
  return sorted
    .map((performance, index) => {
      const label = typeLabel[performance.type];
      if (index > 0 && performance.samePerformerAsPrevious) {
        return lines(
          `이어서 같은 분께서 두 사람을 위해 두 번째 ${label}를 준비해 주셨습니다.`,
          '계속해서 큰 박수 부탁드립니다.',
        );
      }
      if (index > 0) {
        return lines(
          `이어서 ${performance.performerName}께서도 두 사람을 위해 ${label}를 준비해 주셨습니다.`,
          performance.introText,
          '큰 박수로 맞이해 주시길 바라겠습니다.',
        );
      }
      return lines(
        `다음은 두 사람을 위한 ${label}가 준비되었습니다.`,
        `오늘 ${label}는 ${performance.performerName}께서 준비해 주셨습니다.`,
        performance.introText || parentIntro,
        '큰 박수로 맞이해 주시길 바라겠습니다.',
      );
    })
    .join('\n\n');
}

function attendanceTitle(value?: string, custom?: string) {
  if (value === 'father_only') return '아버님';
  if (value === 'mother_only') return '어머님';
  if (value === 'single_host') return '혼주님';
  if (value === 'custom') return custom || '혼주님';
  if (value === 'absent') return '';
  return '부모님';
}

function greetingNarration(item: CeremonyItem) {
  const brideTitle = attendanceTitle(
    item.detailConfig.brideFamilyAttendance,
    item.detailConfig.brideFamilyTitle,
  );
  const groomTitle = attendanceTitle(
    item.detailConfig.groomFamilyAttendance,
    item.detailConfig.groomFamilyTitle,
  );
  return lines(
    '이제 신랑 신부의 양가 부모님 및 내빈께 인사가 있겠습니다.',
    brideTitle
      ? lines(
          `먼저 신부 ${brideTitle}께 인사드리겠습니다.`,
          '두 사람은 자리를 천천히 이동해 주시길 바라겠습니다.',
          '그동안 보내주신 은혜에 감사드리며 예쁘게 잘살도록 하겠습니다.',
          `신랑 신부, 신부 ${brideTitle}께 인사!`,
          !item.detailConfig.omitBrideFamilyHug
            ? `신부 ${brideTitle}께서는 자리에서 일어나 신랑 신부를 한 번 안아 주시길 바라겠습니다.`
            : undefined,
        )
      : undefined,
    groomTitle
      ? lines(
          `이제 이어서 신랑 ${groomTitle}께도 인사드리겠습니다.`,
          '두 사람은 다시 한번 자리를 이동해 주시길 바라겠습니다.',
          '서로 사랑하는 마음 변치 않고 예쁘게 알콩달콩 잘살도록 하겠습니다.',
          `신랑 신부, 신랑 ${groomTitle}께 인사!`,
          !item.detailConfig.omitGroomFamilyHug
            ? `신랑 ${groomTitle}께서는 자리에서 일어나 신랑 신부를 한 번 안아 주시길 바라겠습니다.`
            : undefined,
        )
      : undefined,
    '이어서 내빈 여러분께 인사드리겠습니다.',
    '두 사람은 중앙으로 자리를 이동해 주시길 바라겠습니다.',
    '저희 신랑 신부를 위해 먼 길 찾아주시고 축복해 주셔서 진심으로 감사드립니다.',
    '식을 마치고 난 후 한 분 한 분 직접 찾아뵙고 인사드리는 것이 도리이나, 먼저 이 자리에서 감사의 인사를 드리겠습니다.',
    '신랑 신부, 내빈께 인사!',
    item.customIntro,
  );
}

const candleChildScript: Record<string, { narration: string; cue: string[] }> = {
  candle_mothers_entry: { narration: '양가 어머님, 입장!', cue: ['입장곡 재생', '단상 위치 이동 확인'] },
  candle_groom_parents_entry: { narration: '먼저 신랑 부모님께서 입장하도록 하겠습니다.\n신랑 부모님, 입장!', cue: ['신랑 부모님 입장곡 시작', '지정 위치 정렬'] },
  candle_bride_parents_entry: { narration: '이어서 신부 부모님께서도 입장하도록 하겠습니다.\n신부 부모님, 입장!', cue: ['신부 부모님 입장곡 시작', '지정 위치 정렬'] },
  candle_groom_mother_light: { narration: '먼저 신랑 어머님께서 화촉을 점화해 주시겠습니다.', cue: ['신랑 측 화촉 위치 확인', '점화 완료 확인'] },
  candle_bride_mother_light: { narration: '이어서 신부 어머님께서도 화촉을 점화해 주시겠습니다.', cue: ['신부 측 화촉 위치 확인', '점화 완료 확인'] },
  candle_groom_parents_light: { narration: '먼저 신랑 부모님께서 화촉을 점화해 주시겠습니다.', cue: ['신랑 부모님 화촉 위치 이동 및 점화'] },
  candle_bride_parents_light: { narration: '이어서 신부 부모님께서도 화촉을 점화해 주시겠습니다.', cue: ['신부 부모님 화촉 위치 이동 및 점화'] },
  candle_mothers_bow: { narration: '이제 양가 어머님께서는 서로를 바라봐 주시길 바라겠습니다.\n양가를 존중하는 의미로 첫 번째 인사를 드리겠습니다.\n양가 어머님, 맞절!', cue: ['서로 마주 본 상태 확인 후 맞절 구령'] },
  candle_parents_bow: { narration: '이제 양가 부모님께서는 서로를 바라봐 주시길 바라겠습니다.\n양가를 존중하는 의미로 첫 번째 인사를 드리겠습니다.\n양가 부모님, 맞절!', cue: ['서로 마주 보기 확인', '맞절 완료 확인'] },
  candle_fathers_seat: { narration: '이제 양가 아버님께서는 자리로 이동해 주시면 되겠습니다.', cue: ['양가 아버님 좌석 이동 확인'] },
  candle_mothers_guest_bow: { narration: '오늘 찾아주신 내빈 여러분께 감사의 인사를 드리겠습니다.\n양가 어머님, 내빈께 인사!', cue: ['내빈 방향 전환 확인 후 인사 구령'] },
  candle_parents_guest_bow: { narration: '오늘 찾아주신 내빈 여러분께 감사의 인사를 드리겠습니다.\n양가 부모님, 내빈께 인사!', cue: ['내빈 방향 전환', '인사 완료 확인'] },
  candle_mothers_seat: { narration: '이제 양가 어머님께서는 자리로 이동해 주시길 바라겠습니다.', cue: ['지정 좌석 이동 확인'] },
  candle_parents_seat: { narration: '양가 부모님께서는 이제 자리로 천천히 이동해 주시길 바라겠습니다.', cue: ['좌석 이동 확인'] },
  candle_single_entry: { narration: '혼주님, 입장!', cue: ['혼주님 입장곡 또는 박수 큐'] },
  candle_single_light: { narration: '이어서 혼주님께서 화촉을 점화해 주시겠습니다.', cue: ['화촉 위치 이동 및 점화 확인'] },
  candle_single_guest_bow: { narration: '오늘 찾아주신 내빈 여러분께 감사의 인사를 드리겠습니다.\n혼주님, 내빈께 인사!', cue: ['내빈 방향 확인 후 인사 구령'] },
  candle_single_seat: { narration: '이제 혼주님께서는 자리로 이동해 주시길 바라겠습니다.', cue: ['좌석 이동 확인'] },
};

function sectionForItem(item: CeremonyItem, draft: CeremonyDraft, orderPath: number[]): ScriptSection {
  const defaultText = item.useDefaultNarration ? standardNarration(item, draft) : '';
  const narration = item.narrationOverride?.trim() || defaultText;
  const note = [...(baseNote[item.type] ?? [])];
  if (item.requestNote?.trim()) note.push(item.requestNote.trim());
  return {
    id: item.id,
    parentId: item.parentId,
    title: item.title,
    narration,
    cue: item.cueOverride ?? baseCue[item.type] ?? [],
    note,
    orderPath,
    estimatedTimeSeconds: item.estimatedTimeSeconds,
  };
}

export function generateScript(draft: CeremonyDraft): ScriptPackage {
  const sections: ScriptSection[] = [];
  const sorted = [...draft.items].sort((a, b) => a.order - b.order);

  sorted.forEach((item, index) => {
    if (!item.active) return;
    sections.push(sectionForItem(item, draft, [index]));
    [...(item.children ?? [])]
      .sort((a, b) => a.order - b.order)
      .forEach((nested, childIndex) => {
        if (!nested.active) return;
        const template = candleChildScript[nested.type];
        const childSection = sectionForItem(nested, draft, [index, childIndex]);
        if (template && !nested.narrationOverride) {
          childSection.narration = template.narration;
          childSection.cue = nested.cueOverride ?? template.cue;
        }
        sections.push(childSection);
      });
  });

  const preCeremonyChecklist = [15, 10, 5].map((minute, index): ScriptSection => ({
    id: `pre-ceremony-${minute}`,
    title: `식전 ${minute}분 안내`,
    narration: lines(
      '잠시 로비에 계신 하객 여러분께 안내 말씀드립니다.',
      `잠시 후 신랑 ${draft.basicInfo.groomName} 군과 신부 ${draft.basicInfo.brideName} 양의 결혼식이 진행될 예정입니다.`,
      '아직 로비에 계신 하객 여러분께서는 지금 바로 식장 안으로 입장하시어 앞쪽 빈자리부터 착석해 주시면 대단히 감사하겠습니다.',
      '원활한 예식 진행을 위해 휴대전화는 무음 또는 진동으로 전환해 주시길 부탁드립니다.',
    ),
    cue: [
      `${minute}분 전 ${index + 1}차 안내`,
      '하객 착석 상태 확인',
      '홀 문, 음향, 조명, 입장 대기 상태 확인',
    ],
    note: minute === 5 ? ['방송 후 예도팀 또는 예약실에 개식 가능 여부를 확인합니다.'] : [],
    orderPath: [-1, index],
  }));

  return {
    preCeremonyChecklist,
    ceremonySections: sections,
    globalRequestNote: draft.basicInfo.globalRequestNote,
    totalEstimatedTimeSeconds: sections.reduce(
      (total, section) => total + (section.estimatedTimeSeconds ?? 0),
      0,
    ),
  };
}
