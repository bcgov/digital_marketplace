#! /usr/bin/env bash

NIX_PATH=nixpkgs=https://github.com/NixOS/nixpkgs-channels/archive/a7e559a5504572008567383c3dc8e142fa7a8633.tar.gz nix-shell "$@"
