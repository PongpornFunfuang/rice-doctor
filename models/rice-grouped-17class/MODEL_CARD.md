# RICE DOCTOR grouped multi-source classifier

Coverage: **13 of the 14 Thai-guide diseases**. Rice gall dwarf has no training class or measured recall. The model has 17 outputs: the 13 target diseases plus leaf scald, stem rot, healthy and residue lookalikes.

Architecture: ImageNet MobileNetV2 frozen features with a mlp head. Two predeclared heads were selected using validation macro-F1 only; per-class sigmoid thresholds and the uncertain-result gate were selected on validation. No disease-pretrained 17-class weights were used.

## Held-out result

- Train / validation / test: 3864 / 835 / 840 SHA256-unique files.
- Hash groups: 2222 / 467 / 460; zero group overlap.
- Macro-F1 across 17 outputs: 88.15%; macro-F1 across the 13 target diseases: 88.12%.
- Micro-F1: 81.84%; top-1 in any true label: 83.57%; exact label-set accuracy: 69.76%.
- This is multi-label evaluation; top-1-in-true-label is not exact-label-set accuracy.

| Class | Test positives | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| bacterial_leaf_blight | 196 | 78.5% | 80.1% | 79.3% |
| brown_spot | 132 | 78.9% | 79.5% | 79.2% |
| grain_discoloration | 39 | 97.2% | 89.7% | 93.3% |
| leaf_blast | 210 | 77.0% | 71.9% | 74.4% |
| leaf_scald | 84 | 83.1% | 88.1% | 85.5% |
| narrow_brown_spot | 118 | 79.1% | 89.8% | 84.1% |
| pesticide_residue | 13 | 85.7% | 92.3% | 88.9% |
| healthy | 49 | 92.3% | 73.5% | 81.8% |
| bacterial_leaf_streak | 13 | 76.9% | 76.9% | 76.9% |
| bakanae | 11 | 100.0% | 100.0% | 100.0% |
| grassy_stunt_virus | 11 | 100.0% | 100.0% | 100.0% |
| ragged_stunt_virus | 22 | 100.0% | 90.9% | 95.2% |
| rice_false_smut | 15 | 100.0% | 100.0% | 100.0% |
| sheath_blight | 8 | 80.0% | 100.0% | 88.9% |
| sheath_rot | 11 | 62.5% | 90.9% | 74.1% |
| stem_rot | 15 | 93.8% | 100.0% | 96.8% |
| tungro_virus | 8 | 100.0% | 100.0% | 100.0% |

## Data, rights and limitations

- [Raw Dataset v1, Rice Diseases / Roboflow](https://universe.roboflow.com/rice-diseases-3bosa/raw-dataset-mo0hq): uploader declares CC BY 4.0. Segmentation labels were combined into image-level multi-label targets.
- [IoT-RiceMobileNet v1.0.0, eimran](https://doi.org/10.5281/zenodo.21140529): CC BY 4.0 per record.
- [Philippines Rice Diseases, Shruti Agarwal / Kaggle](https://www.kaggle.com/datasets/shrupyag001/philippines-rice-diseases): uploader declares AGPL-3.0. Retain the declared licence and source credit when distributing derived data/code; original-image provenance has not been independently audited image by image.
- Exact SHA256 copies collapsed. Rotation/reflection-aware pHash groups at Hamming distance <=4 stay in one split. Cropped variants and same-plant/farm relationships can remain undetected.
- Sources and capture conditions are mixed. Some labels have very few independent examples; controlled backgrounds can correlate with disease labels. Labels have not been confirmed by a Thai plant pathologist.
- This holdout comes from the same source datasets. **No independent Thai-farm validation. No 80% guarantee for all 14 diseases.**
- Scores are uncalibrated sigmoid model outputs, not disease probabilities. A healthy output cannot rule out an unsupported disease or a missed lesion.
- Research triage only. Confirm symptoms and follow local agricultural guidance before management.

Reproduction: work/build_grouped_dataset.py, work/train_grouped_model.py, work/select_grouped_head.py; experiment plan and detailed manifests are retained in work/rice-grouped. evaluation.json and coverage.csv provide the per-class evidence.

## Uncertainty and export verification

95% percentile bootstrap intervals over whole perceptual hash groups (1,000 resamples): macro-F1 81.91–90.77%; target-13 macro-F1 83.31–91.35%; top-1-in-true-label 79.54–87.08%. These intervals are conditional on the source datasets and labels. Per-class positive hash-group counts are in verification.json; e.g. sheath blight has only 6 groups. Small-class perfect scores are not reliable guarantees.

ONNX versus PyTorch maximum logit difference on three random inputs: 0.00003243. This verifies numerical export, not disease accuracy.
