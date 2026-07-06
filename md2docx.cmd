@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem ============================================================
rem  md2docx.cmd - Markdown(.md) 파일을 Word(.docx)로 변환
rem
rem  사용법:
rem      md2docx.cmd "경로\문서.md"
rem      md2docx.cmd "경로\문서.md" "경로\출력.docx"
rem
rem  - 두 번째 인수(출력 경로)를 생략하면 입력 파일과 같은 폴더에
rem    같은 이름의 .docx 파일로 저장한다.
rem ============================================================

if "%~1"=="" (
    echo [오류] 변환할 MD 파일 경로를 인수로 지정하세요.
    echo         예: md2docx.cmd "C:\path\to\문서.md"
    exit /b 1
)

set "MD_PATH=%~f1"
if not exist "%MD_PATH%" (
    echo [오류] 파일을 찾을 수 없습니다: %MD_PATH%
    exit /b 1
)

rem 출력 경로: 2번째 인수가 있으면 사용, 없으면 입력과 동일 폴더/이름의 .docx
if not "%~2"=="" (
    set "OUT_PATH=%~f2"
) else (
    set "OUT_PATH=%~dpn1.docx"
)

rem convert.py 위치(이 배치 파일 기준 상대경로)
set "SCRIPT_DIR=%~dp0"
set "CONVERT_PY=%SCRIPT_DIR%skills\docx\scripts\convert.py"
if not exist "%CONVERT_PY%" (
    echo [오류] 변환 스크립트를 찾을 수 없습니다: %CONVERT_PY%
    exit /b 1
)

rem Python 실행기 탐색: py -> python -> 알려진 사용자 경로
set "PYTHON="
where py >nul 2>nul && set "PYTHON=py"
if not defined PYTHON (
    where python >nul 2>nul && set "PYTHON=python"
)
if not defined PYTHON (
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)
if not defined PYTHON (
    echo [오류] Python 실행기를 찾을 수 없습니다. Python을 설치하거나 PATH에 추가하세요.
    exit /b 1
)

rem payload JSON 생성 + 변환 실행 (PowerShell로 UTF-8 처리, BOM 없이)
set "TITLE=%~n1"
set "PAYLOAD=%TEMP%\md2docx_payload.json"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$md=[System.IO.File]::ReadAllText('%MD_PATH%');" ^
  "$p=@{templatePath='';outputPath='%OUT_PATH%';title='%TITLE%';content=$md}|ConvertTo-Json -Compress;" ^
  "[System.IO.File]::WriteAllText('%PAYLOAD%',$p,(New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 (
    echo [오류] payload 생성에 실패했습니다.
    exit /b 1
)

echo [진행] 변환 중: %MD_PATH%
"%PYTHON%" "%CONVERT_PY%" "%PAYLOAD%"
set "RC=%ERRORLEVEL%"

del "%PAYLOAD%" >nul 2>nul

if not "%RC%"=="0" (
    echo [오류] 변환에 실패했습니다. (종료 코드 %RC%)
    exit /b %RC%
)

echo.
echo [완료] 저장됨: %OUT_PATH%
endlocal
exit /b 0
