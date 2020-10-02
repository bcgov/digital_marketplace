{ systemPkgs ? import <nixpkgs> {} }:

let

  realfolk = import (systemPkgs.fetchFromGitHub {
    owner = "realfolk";
    repo = "nix";
    rev = "a3b366208534596705f1c0faff6b9d96584109a8";
    sha256 = "0i5v2r8r7vazdm1ywzl85xnakddg53rq4cjmk1vznay4d8z4m5sh";
  });

  pkgs = realfolk.config.pkgSet;

  ctagsArgs = [
    # Exclude version control, tmp files and node_modules.
    "--exclude=\\.git"
    "--exclude=*node_modules*"
    "--exclude=tmp"
    "--exclude=*.tmp.*"
    # Sort tags by default.
    "--sort=yes"
    # TypeScript language definition.
    "--langdef=typescript"
    "--langmap=typescript:.ts.tsx"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+([a-z]+[ \\t]+)?)?class[ \\t]+([a-zA-Z0-9_$]+)/\\3/c,classes/"
    "--regex-typescript=/^[ \\t]*(declare[ \\t]+)?namespace[ \\t]+([a-zA-Z0-9_$]+)/\\2/c,modules/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?module[ \\t]+([a-zA-Z0-9_$]+)/\\2/n,modules/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?(default[ \\t]+)?(async[ \\t]+)?function(\\*)?[ \\t]+([a-zA-Z0-9_$]+)/\\5/f,functions/"
    "--regex-typescript=/^[ \\t]*export[ \\t]+(var|let|const)[ \\t]+([a-zA-Z0-9_$]+)/\\2/v,variables/"
    "--regex-typescript=/^[ \\t]*(var|let|const)[ \\t]+([a-zA-Z0-9_$]+)[ \\t]*=[ \\t]*function[ \\t]*[*]?[ \\t]*\\(\\)/\\2/v,varlambdas/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?(public|protected|private)[ \\t]+(static[ \\t]+)?(abstract[ \\t]+)?(((get|set|readonly)[ \\t]+)|(async[ \\t]+[*]*[ \\t]*))?([a-zA-Z1-9_$]+)/\\9/m,members/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?interface[ \\t]+([a-zA-Z0-9_$]+)/\\2/i,interfaces/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?type[ \\t]+([a-zA-Z0-9_$]+)/\\2/t,types/"
    "--regex-typescript=/^[ \\t]*(export[ \\t]+)?enum[ \\t]+([a-zA-Z0-9_$]+)/\\2/e,enums/"
    "--regex-typescript=/^[ \\t]*import[ \\t]+([a-zA-Z0-9_$]+)/\\1/I,imports/"
  ];

  ctags = pkgs.writeScriptBin "ctags" ''
    #!/bin/sh
    exec ${pkgs.ctags}/bin/ctags ${pkgs.lib.concatStringsSep " " (map pkgs.lib.escapeShellArg ctagsArgs)} "$@"
  '';

in

  realfolk.lib.mkShell {
    buildInputs = with pkgs; [ nodejs-10_x sass postgresql_10 docker_compose docker openshift ctags ];
    shellHook = ''
      [ -f ~/.bashrc ] && source ~/.bashrc
      npm install
    '';
  }
