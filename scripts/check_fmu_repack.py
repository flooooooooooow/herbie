#!/usr/bin/env python3
"""Cross-check a Herbie FMU repack against its source FMU with Python's zipfile.

Usage: check_fmu_repack.py ORIGINAL.fmu REPACK.fmu

Every file entry of the original (directory entries excluded) must be present in the
repack with identical bytes, the repack must hold nothing else, and every repack entry
must be stored (method 0) without encryption or a data descriptor.
"""
import sys
import zipfile


def files(z):
    return {i.filename: i for i in z.infolist() if not i.filename.endswith("/")}


def main(original, repack):
    with zipfile.ZipFile(original) as zo, zipfile.ZipFile(repack) as zr:
        fo, fr = files(zo), files(zr)
        if set(fo) != set(fr):
            print("name mismatch:", sorted(set(fo) ^ set(fr)))
            return 1
        for name, info in fr.items():
            if info.compress_type != zipfile.ZIP_STORED or info.flag_bits & 0x9:
                print("unexpected method or flags:", name, info.compress_type, info.flag_bits)
                return 1
            if zo.read(name) != zr.read(name):
                print("content mismatch:", name)
                return 1
        print("repack matches", original, "in", len(fr), "files")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
