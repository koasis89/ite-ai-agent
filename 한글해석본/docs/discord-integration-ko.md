# Discord 통합 설정: 웹훅 URL과 봇 토큰

OMX는 두 개의 Discord 알림 화면을 지원합니다. 이는 별도의 Discord 개념이며 별도의 OMX 키로 구성됩니다.

- **수신 웹훅 URL**: 하나의 Discord 채널에 아웃바운드 알림을 게시하기 위한 HTTPS 엔드포인트입니다. 간단하고 채널 범위이며 Discord 봇 사용자로 로그인하지 않습니다.
- **봇 토큰**: Discord 개발자 포털 애플리케이션/봇을 위한 비밀 토큰입니다. 이를 통해 OMX는 채널 읽기 또는 메시지 상관 관계가 필요한 봇 ID 전송 및 응답/상태 워크플로에 Discord Bot API를 사용할 수 있습니다.

두 값을 모두 비공개로 유지하세요. 공개 문제, 로그, 스크린샷 또는 공유 구성에 웹훅 URL이나 봇 토큰을 붙여넣지 마세요.

## 어떤 자격 증명이 필요합니까?

| OMX mode / goal | Required Discord credential(s) | OMX config platform | Typical env names |
| --- | --- | --- | --- |
| Webhook-only outbound notifications | One incoming webhook URL | `notifications.discord` | `OMX_DISCORD_WEBHOOK_URL` |
| Bot-only outbound notifications | Bot token + target channel ID | `notifications["discord-bot"]` | `OMX_DISCORD_NOTIFIER_BOT_TOKEN`, `OMX_DISCORD_NOTIFIER_CHANNEL` |
| Reply listener / `status` replies to tracked OMX notifications | Bot token + target channel ID + authorized Discord user IDs; enable replies | `notifications["discord-bot"]` plus `notifications.reply` | `OMX_DISCORD_NOTIFIER_BOT_TOKEN`, `OMX_DISCORD_NOTIFIER_CHANNEL`, `OMX_REPLY_ENABLED`, `OMX_REPLY_DISCORD_USER_IDS` |
| Hybrid webhook + bot | One incoming webhook URL, one bot token, one target channel ID | Both `notifications.discord` and `notifications["discord-bot"]` | All of the above webhook + bot env vars |

OMX가 알림만 게시하도록 하려면 웹훅 전용 모드를 사용하세요. 봇 ID 전달, 응답 상관 관계 또는 응답/상태 리스너와 같은 Discord API 기능이 필요한 경우 봇 모드를 사용하세요.

## 하이브리드 모드에 두 개가 아닌 하나의 웹훅이 필요한 이유

웹후크는 이미 한 채널에 대한 완전한 아웃바운드 게시 엔드포인트입니다. 봇은 봇 토큰과 함께 Discord API를 사용할 수 있는 다른 Discord ID입니다. 봇 모드 메시지를 보내는 데 자체 웹훅이 필요하지 **않습니다**. 하이브리드 모드에서 OMX는 다음을 제공합니다.

1. 웹훅 발신자에 대한 웹훅 URL 1개,
2. 하나의 봇 토큰 + 봇 발신자/청취자의 채널 ID.

의도적으로 두 번째 웹훅 ID, 다른 채널 또는 독립적인 순환을 원하는 경우에만 두 번째 웹훅을 생성하세요. 단지 봇 모드도 구성되어 있다고 해서 꼭 필요한 것은 아닙니다.

## 수신 웹훅 URL 생성

1. Discord에서 OMX가 게시해야 하는 서버와 채널을 엽니다.
2. **서버 설정** 또는 채널 설정을 연 다음 **통합** → **웹후크**를 엽니다.
3. **새 웹훅**을 선택하고 대상 채널을 선택하고 이름을 지정한 후 웹훅 URL을 복사하세요.
4. `.omx-config.json`에 `OMX_DISCORD_WEBHOOK_URL` 또는 `notifications.discord.webhookUrl`로 저장합니다.

웹훅 URL은 채널 범위입니다. 메시지가 잘못된 채널에 나타나는 경우 원하는 채널의 통합 설정에서 웹훅을 생성/복사하세요.

## Discord 봇 토큰 만들기

1. Discord 개발자 포털을 열고 애플리케이션을 생성하거나 선택하세요.
2. 애플리케이션에 **봇**을 추가합니다.
3. 봇 페이지에서 봇 토큰을 재설정/복사하세요. `OMX_DISCORD_NOTIFIER_BOT_TOKEN` 또는 `notifications["discord-bot"].botToken`로 저장합니다.
4. 개발자 포털 OAuth2 URL 생성기에서 서버에 봇을 초대합니다. `bot` 범위를 선택하고 OMX에 필요한 권한만 부여하세요.
5. 대상 채널 ID를 복사하여 `OMX_DISCORD_NOTIFIER_CHANNEL` 또는 `notifications["discord-bot"].channelId`로 저장합니다. Discord에서 ID를 복사하려면 개발자 모드를 활성화해야 할 수도 있습니다.

봇 토큰만으로는 충분하지 않습니다. 봇도 서버에 초대되어야 하며 대상 채널에서 보고 게시할 수 있어야 합니다.

## 최소한의 봇 권한 및 의도

아웃바운드 봇 알림의 경우 대상 채널에서 봇을 부여합니다.

- 채널 보기
- 메시지 보내기

회신/상태 워크플로의 경우 다음도 부여합니다.

- 메시지 기록 읽기
- 승인 반응이 성공하도록 하려면 반응 추가

기본 아웃바운드 전송에는 권한 있는 게이트웨이 인텐트가 필요하지 않습니다. 봇/회신 리스너를 통해 메시지 콘텐츠를 읽는 워크플로를 활성화하고 Discord 애플리케이션 설정에서 이를 요구하는 경우 개발자 포털에서 해당 봇에 대해 **메시지 콘텐츠 의도**를 활성화하세요. 워크플로에 필요한 경우가 아니면 권한 있는 의도를 해제 상태로 유지하세요.

## 구성 예

비밀에는 환경 변수를 선호합니다. 아래 JSON 예제는 지원되는 `.omx-config.json` 형태를 보여주지만 파일에서 비밀 필드를 생략하고 대신 env var를 통해 제공할 수 있습니다.

### 웹훅 전용 아웃바운드 알림

```bash
export OMX_DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/.../...'
```

```json
{
  "notifications": {
    "enabled": true,
    "discord": {
      "enabled": true,
      "webhookUrl": "https://discord.com/api/webhooks/.../..."
    }
  }
}
```

### 봇 전용 아웃바운드 알림

```bash
export OMX_DISCORD_NOTIFIER_BOT_TOKEN='your-bot-token'
export OMX_DISCORD_NOTIFIER_CHANNEL='123456789012345678'
```

```json
{
  "notifications": {
    "enabled": true,
    "discord-bot": {
      "enabled": true,
      "botToken": "your-bot-token",
      "channelId": "123456789012345678"
    }
  }
}
```

### 회신/상태 리스너가 포함된 하이브리드 웹훅 + 봇

```bash
export OMX_DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/.../...'
export OMX_DISCORD_NOTIFIER_BOT_TOKEN='your-bot-token'
export OMX_DISCORD_NOTIFIER_CHANNEL='123456789012345678'
export OMX_REPLY_ENABLED='true'
export OMX_REPLY_DISCORD_USER_IDS='111111111111111111,222222222222222222'
```

```json
{
  "notifications": {
    "enabled": true,
    "discord": {
      "enabled": true,
      "webhookUrl": "https://discord.com/api/webhooks/.../..."
    },
    "discord-bot": {
      "enabled": true,
      "botToken": "your-bot-token",
      "channelId": "123456789012345678"
    },
    "reply": {
      "enabled": true,
      "authorizedDiscordUserIds": ["111111111111111111", "222222222222222222"]
    }
  }
}
```

웹훅 및 봇 전송에 대한 선택적 공유 멘션:

```bash
export OMX_DISCORD_MENTION='<@123456789012345678>'
# or a role mention such as '<@&123456789012345678>'
```

## 일반적인 실패 모드

- **잘못된 봇 토큰**: 개발자 포털에서 토큰을 다시 생성하고 `OMX_DISCORD_NOTIFIER_BOT_TOKEN` / `notifications["discord-bot"].botToken`을 업데이트합니다.
- **봇 토큰은 다른 곳에서는 작동하지만 OMX에서는 작동하지 않습니다**: `OMX_DISCORD_NOTIFIER_CHANNEL` / `channelId`이 채널 이름이나 웹훅 ID가 아닌 숫자 채널 ID인지 확인하세요.
- **봇이 서버에 없습니다**: `bot` OAuth2 범위로 애플리케이션 봇을 초대합니다.
- **채널 권한 누락**: 채널 보기 및 메시지 보내기 권한을 부여합니다. 회신/상태 워크플로에 대한 메시지 읽기 기록을 추가합니다.
- **웹훅이 삭제되었거나 잘못된 채널에서 복사됨**: 의도한 채널의 통합/웹훅 페이지에서 수신 웹훅을 다시 생성/복사하고 `OMX_DISCORD_WEBHOOK_URL` / `notifications.discord.webhookUrl`을 업데이트합니다.
- **하이브리드 모드는 중복된 메시지를 게시합니다**: `notifications.discord` 및 `notifications["discord-bot"]`이 모두 활성화되어 있으므로 두 전송 모두 보낼 수 있습니다. Discord 메시지 경로를 하나만 원할 경우 하나를 비활성화하세요.
- **응답 청취자에게 Discord가 비활성화되었거나 승인된 사용자가 없다고 말합니다**: `OMX_REPLY_ENABLED=true`을 설정하고 `OMX_REPLY_DISCORD_USER_IDS` 또는 `notifications.reply.authorizedDiscordUserIds`를 응답이 허용된 Discord 사용자 ID로 설정합니다.
