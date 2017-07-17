@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  restclient startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

@rem Add default JVM options here. You can also use JAVA_OPTS and RESTCLIENT_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS="-Xms128m" "-Xmx512m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto init

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:init
@rem Get command-line arguments, handling Windows variants

if not "%OS%" == "Windows_NT" goto win9xME_args
if "%@eval[2+2]" == "4" goto 4NT_args

:win9xME_args
@rem Slurp the command line arguments.
set CMD_LINE_ARGS=
set _SKIP=2

:win9xME_args_slurp
if "x%~1" == "x" goto execute

set CMD_LINE_ARGS=%*
goto execute

:4NT_args
@rem Get arguments from the 4NT Shell from JP Software
set CMD_LINE_ARGS=%$

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\lib\restclient-ui-3.6.1.jar;%APP_HOME%\lib\restclient-lib-3.6.1.jar;%APP_HOME%\lib\filechooser-abstraction-0.1.0.jar;%APP_HOME%\lib\jide-oss-3.6.14.jar;%APP_HOME%\lib\swingx-autocomplete-1.6.5-1.jar;%APP_HOME%\lib\rsyntaxtextarea-2.5.8.jar;%APP_HOME%\lib\macify-1.6.jar;%APP_HOME%\lib\restclient-server-3.6.1.jar;%APP_HOME%\lib\guice-4.0.jar;%APP_HOME%\lib\mycila-guice-jsr250-3.6.ga.jar;%APP_HOME%\lib\junit-4.12.jar;%APP_HOME%\lib\jackson-mapper-asl-1.9.13.jar;%APP_HOME%\lib\httpclient-4.5.2.jar;%APP_HOME%\lib\httpmime-4.5.2.jar;%APP_HOME%\lib\groovy-all-2.4.4.jar;%APP_HOME%\lib\jericho-html-3.4.jar;%APP_HOME%\lib\app-update-framework-app-update-0.2.1.jar;%APP_HOME%\lib\xom-1.2.10.jar;%APP_HOME%\lib\swingx-common-1.6.5-1.jar;%APP_HOME%\lib\commons-lib-0.4.2.jar;%APP_HOME%\lib\jetty-servlet-9.3.2.v20150730.jar;%APP_HOME%\lib\javax.inject-1.jar;%APP_HOME%\lib\aopalliance-1.0.jar;%APP_HOME%\lib\mycila-guice-injection-3.6.ga.jar;%APP_HOME%\lib\mycila-guice-closeable-3.6.ga.jar;%APP_HOME%\lib\hamcrest-core-1.3.jar;%APP_HOME%\lib\jackson-core-asl-1.9.13.jar;%APP_HOME%\lib\httpcore-4.4.4.jar;%APP_HOME%\lib\commons-logging-1.2.jar;%APP_HOME%\lib\commons-codec-1.9.jar;%APP_HOME%\lib\javax.json-1.0.4.jar;%APP_HOME%\lib\xml-apis-1.3.03.jar;%APP_HOME%\lib\jetty-security-9.3.2.v20150730.jar;%APP_HOME%\lib\sisu-guice-3.2.3.jar;%APP_HOME%\lib\jetty-server-9.3.2.v20150730.jar;%APP_HOME%\lib\javax.servlet-api-3.1.0.jar;%APP_HOME%\lib\jetty-http-9.3.2.v20150730.jar;%APP_HOME%\lib\jetty-io-9.3.2.v20150730.jar;%APP_HOME%\lib\jetty-util-9.3.2.v20150730.jar;%APP_HOME%\lib\guava-18.0.jar

@rem Execute restclient
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %RESTCLIENT_OPTS%  -classpath "%CLASSPATH%" org.wiztools.restclient.ui.Main %CMD_LINE_ARGS%

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable RESTCLIENT_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
if  not "" == "%RESTCLIENT_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
