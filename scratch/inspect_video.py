import cv2
import easyocr
import os
import sys

def main():
    video_path = r"d:\antigravity\gadogaucho_v3\auction_ocr_poc\outputs\leilao_lavras_do_sul_2026_06_16_28\video_28.mp4"
    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}")
        return

    print(f"Opening video: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error opening video file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_sec = total_frames / fps if fps > 0 else 0

    print(f"Video Properties:")
    print(f"  FPS: {fps}")
    print(f"  Total Frames: {total_frames}")
    print(f"  Resolution: {width}x{height}")
    print(f"  Duration: {duration_sec:.2f} seconds ({duration_sec/60:.2f} minutes)")

    # Let's read a frame at 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%
    percentages = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    reader = easyocr.Reader(['pt'], gpu=True)

    scratch_dir = r"d:\antigravity\gadogaucho_v3\scratch"
    os.makedirs(scratch_dir, exist_ok=True)

    report_path = os.path.join(scratch_dir, "lavras_inspection_report.txt")
    with open(report_path, "w", encoding="utf-8") as report:
        report.write("Lavras do Sul Video Inspection Report\n")
        report.write("======================================\n\n")
        report.write(f"Video Path: {video_path}\n")
        report.write(f"Resolution: {width}x{height}\n")
        report.write(f"Duration: {duration_sec/60:.2f} minutes\n\n")

        for pct in percentages:
            frame_idx = int(total_frames * (pct / 100))
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                print(f"Could not read frame at {pct}%")
                continue

            # Save frame image
            img_name = f"frame_{pct}.png"
            img_path = os.path.join(scratch_dir, img_name)
            cv2.imwrite(img_path, frame)
            print(f"Saved {img_name}")

            # Run OCR on the full frame
            print(f"Running OCR on full frame for {pct}%...")
            results_full = reader.readtext(frame, detail=0)
            
            # Run OCR on bottom 25% (normal behavior)
            roi_y_start = int(height * 0.75)
            roi = frame[roi_y_start:height, 0:width]
            results_bottom_25 = reader.readtext(roi, detail=0)

            # Write to report
            timestamp_sec = frame_idx / fps
            timestamp_str = f"{int(timestamp_sec//3600):02d}:{int((timestamp_sec%3600)//60):02d}:{int(timestamp_sec%60):02d}"
            
            report.write(f"--- Frame at {pct}% ({timestamp_str}) ---\n")
            report.write(f"Image saved to: {img_path}\n")
            report.write("Full Frame OCR text:\n")
            report.write("  " + " | ".join(results_full) + "\n\n")
            report.write("Bottom 25% ROI OCR text:\n")
            report.write("  " + " | ".join(results_bottom_25) + "\n")
            report.write("-" * 40 + "\n\n")

    cap.release()
    print("Inspection finished. Report written to:", report_path)

if __name__ == "__main__":
    main()
