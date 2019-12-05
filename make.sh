#! /bin/bash

time tsc --diagnostics --incremental --project "/home/scallywag/work/realfolk/digital_marketplace/src/front-end/typescript" --outDir "/home/scallywag/work/realfolk/digital_marketplace/tmp/grunt/js"

[ $? -eq 0 ] && grunt browserify:build
