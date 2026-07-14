"""테스트는 실제 Claude를 부르지 않는다.

`back/.env`에 `YEON_ANALYSIS_ENGINE=agent`가 들어 있으면 테스트도 그것을 읽어 실제 API를
호출한다. 그러면 테스트가 느려지고(호출당 수 초), 돈이 들고, 모델 출력에 따라 결과가 흔들려
결정적이지 않게 된다.

환경변수는 .env보다 우선하므로 여기서 목업으로 고정한다. 에이전트를 태우는 검증은
`scripts/agent_smoke.py`가 담당한다.
"""

import os

os.environ["YEON_ANALYSIS_ENGINE"] = "mock"
os.environ["YEON_SEED_DEMO_DATA"] = "false"
