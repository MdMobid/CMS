#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_NAME    64
#define MAX_DATE    16
#define MAX_CLASSES 20
#define MAX_STU     200
#define MAX_QUIZZES 20
#define DATA_DIR    "cms_data"

typedef struct {
    int  roll;
    char name[MAX_NAME];
    char class_id[16];
} Student;

typedef struct {
    int  roll;
    char date[MAX_DATE];
    int  present;
} AttendanceRecord;

typedef struct {
    int  roll;
    int  quiz_no;
    float marks;
    float max_marks;
} QuizRecord;

void ensure_dir() {
#ifdef _WIN32
    system("if not exist " DATA_DIR " mkdir " DATA_DIR);
#else
    system("mkdir -p " DATA_DIR);
#endif
}

void class_file(char *out, const char *class_id, const char *suffix) {
    snprintf(out, 256, DATA_DIR "/%s_%s.csv", class_id, suffix);
}

void cmd_add_class(const char *class_id, const char *class_name) {
    ensure_dir();
    FILE *fp = fopen(DATA_DIR "/classes.csv", "a");
    if (!fp) { printf("ERROR:Cannot open classes file\n"); return; }
    fclose(fp);
    fp = fopen(DATA_DIR "/classes.csv", "r");
    char line[256];
    while (fgets(line, sizeof(line), fp)) {
        char id[64]; sscanf(line, "%63[^,]", id);
        if (strcmp(id, class_id) == 0) {
            fclose(fp); printf("ERROR:Class ID already exists\n"); return;
        }
    }
    fclose(fp);
    fp = fopen(DATA_DIR "/classes.csv", "a");
    fprintf(fp, "%s,%s\n", class_id, class_name);
    fclose(fp);
    printf("OK:Class added\n");
}

void cmd_list_classes() {
    ensure_dir();
    FILE *fp = fopen(DATA_DIR "/classes.csv", "r");
    if (!fp) { printf("CLASSES:\n"); return; }
    printf("CLASSES:");
    char line[256];
    int first = 1;
    while (fgets(line, sizeof(line), fp)) {
        line[strcspn(line, "\n")] = 0;
        if (strlen(line) < 2) continue;
        if (!first) printf("|");
        printf("%s", line);
        first = 0;
    }
    printf("\n");
    fclose(fp);
}

void cmd_delete_class(const char *class_id) {
    ensure_dir();
    FILE *fp = fopen(DATA_DIR "/classes.csv", "r");
    FILE *tmp = fopen(DATA_DIR "/classes_tmp.csv", "w");
    if (!fp || !tmp) { printf("ERROR:Cannot open file\n"); return; }
    char line[256];
    while (fgets(line, sizeof(line), fp)) {
        char id[64]; sscanf(line, "%63[^,]", id);
        if (strcmp(id, class_id) != 0) fputs(line, tmp);
    }
    fclose(fp); fclose(tmp);
    remove(DATA_DIR "/classes.csv");
    rename(DATA_DIR "/classes_tmp.csv", DATA_DIR "/classes.csv");
    printf("OK:Class deleted\n");
}

void cmd_add_student(const char *class_id, int roll, const char *name) {
    ensure_dir();
    char path[256]; class_file(path, class_id, "students");
    FILE *fp = fopen(path, "r");
    if (fp) {
        char line[256];
        while (fgets(line, sizeof(line), fp)) {
            int r; sscanf(line, "%d", &r);
            if (r == roll) { fclose(fp); printf("ERROR:Roll already exists in class\n"); return; }
        }
        fclose(fp);
    }
    fp = fopen(path, "a");
    if (!fp) { printf("ERROR:Cannot open students file\n"); return; }
    fprintf(fp, "%d,%s\n", roll, name);
    fclose(fp);
    printf("OK:Student added\n");
}

void cmd_list_students(const char *class_id) {
    char path[256]; class_file(path, class_id, "students");
    FILE *fp = fopen(path, "r");
    if (!fp) { printf("STUDENTS:\n"); return; }
    printf("STUDENTS:");
    char line[256]; int first = 1;
    while (fgets(line, sizeof(line), fp)) {
        line[strcspn(line, "\n")] = 0;
        if (strlen(line) < 2) continue;
        if (!first) printf("|");
        printf("%s", line);
        first = 0;
    }
    printf("\n");
    fclose(fp);
}

void cmd_delete_student(const char *class_id, int roll) {
    char path[256]; class_file(path, class_id, "students");
    FILE *fp = fopen(path, "r");
    FILE *tmp = fopen(DATA_DIR "/stu_tmp.csv", "w");
    if (!fp || !tmp) { printf("ERROR:Cannot open file\n"); return; }
    char line[256];
    while (fgets(line, sizeof(line), fp)) {
        int r; sscanf(line, "%d", &r);
        if (r != roll) fputs(line, tmp);
    }
    fclose(fp); fclose(tmp);
    remove(path);
    rename(DATA_DIR "/stu_tmp.csv", path);
    printf("OK:Student deleted\n");
}

void cmd_mark_attendance(const char *class_id, const char *date, int roll, int present) {
    char path[256]; class_file(path, class_id, "attendance");
    FILE *fp = fopen(path, "r");
    FILE *tmp = fopen(DATA_DIR "/att_tmp.csv", "w");
    if (fp && tmp) {
        char line[256];
        while (fgets(line, sizeof(line), fp)) {
            int r; char d[MAX_DATE]; int p;
            if (sscanf(line, "%d,%15[^,],%d", &r, d, &p) == 3) {
                if (!(r == roll && strcmp(d, date) == 0)) fputs(line, tmp);
            }
        }
        fclose(fp); fclose(tmp);
        remove(path);
        rename(DATA_DIR "/att_tmp.csv", path);
    } else { if(fp) fclose(fp); if(tmp) fclose(tmp); }
    fp = fopen(path, "a");
    if (!fp) { printf("ERROR:Cannot open attendance file\n"); return; }
    fprintf(fp, "%d,%s,%d\n", roll, date, present);
    fclose(fp);
    printf("OK:Attendance marked\n");
}

void cmd_get_attendance(const char *class_id) {
    char path[256]; class_file(path, class_id, "attendance");
    FILE *fp = fopen(path, "r");
    if (!fp) { printf("ATTENDANCE:\n"); return; }
    printf("ATTENDANCE:");
    char line[256]; int first = 1;
    while (fgets(line, sizeof(line), fp)) {
        line[strcspn(line, "\n")] = 0;
        if (strlen(line) < 2) continue;
        if (!first) printf("|");
        printf("%s", line);
        first = 0;
    }
    printf("\n");
    fclose(fp);
}

void cmd_add_marks(const char *class_id, int roll, int quiz_no, float marks, float max_marks) {
    char path[256]; class_file(path, class_id, "marks");
    FILE *fp = fopen(path, "r");
    FILE *tmp = fopen(DATA_DIR "/mrk_tmp.csv", "w");
    if (fp && tmp) {
        char line[256];
        while (fgets(line, sizeof(line), fp)) {
            int r, q; float m, mx;
            if (sscanf(line, "%d,%d,%f,%f", &r, &q, &m, &mx) == 4) {
                if (!(r == roll && q == quiz_no)) fputs(line, tmp);
            }
        }
        fclose(fp); fclose(tmp);
        remove(path);
        rename(DATA_DIR "/mrk_tmp.csv", path);
    } else { if(fp) fclose(fp); if(tmp) fclose(tmp); }
    fp = fopen(path, "a");
    if (!fp) { printf("ERROR:Cannot open marks file\n"); return; }
    fprintf(fp, "%d,%d,%.2f,%.2f\n", roll, quiz_no, marks, max_marks);
    fclose(fp);
    printf("OK:Marks added\n");
}

void cmd_get_marks(const char *class_id) {
    char path[256]; class_file(path, class_id, "marks");
    FILE *fp = fopen(path, "r");
    if (!fp) { printf("MARKS:\n"); return; }
    printf("MARKS:");
    char line[256]; int first = 1;
    while (fgets(line, sizeof(line), fp)) {
        line[strcspn(line, "\n")] = 0;
        if (strlen(line) < 2) continue;
        if (!first) printf("|");
        printf("%s", line);
        first = 0;
    }
    printf("\n");
    fclose(fp);
}

void cmd_export_attendance_csv(const char *class_id) {
    char path[256]; class_file(path, class_id, "attendance");
    FILE *fp = fopen(path, "r");
    if (!fp) { printf("ERROR:No attendance data\n"); return; }
    printf("roll,date,present\n");
    char line[256];
    while (fgets(line, sizeof(line), fp)) printf("%s", line);
    fclose(fp);
}

void cmd_export_marks_csv(const char *class_id) {
    char path[256]; class_file(path, class_id, "marks");
    FILE *fp = fopen(path, "r");
    if (!fp) { printf("ERROR:No marks data\n"); return; }
    printf("roll,quiz_no,marks,max_marks\n");
    char line[256];
    while (fgets(line, sizeof(line), fp)) printf("%s", line);
    fclose(fp);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("ERROR:No command\n"); return 1; }
    const char *cmd = argv[1];

    if (strcmp(cmd, "add_class") == 0 && argc >= 4)
        cmd_add_class(argv[2], argv[3]);
    else if (strcmp(cmd, "list_classes") == 0)
        cmd_list_classes();
    else if (strcmp(cmd, "delete_class") == 0 && argc >= 3)
        cmd_delete_class(argv[2]);
    else if (strcmp(cmd, "add_student") == 0 && argc >= 5)
        cmd_add_student(argv[2], atoi(argv[3]), argv[4]);
    else if (strcmp(cmd, "list_students") == 0 && argc >= 3)
        cmd_list_students(argv[2]);
    else if (strcmp(cmd, "delete_student") == 0 && argc >= 4)
        cmd_delete_student(argv[2], atoi(argv[3]));
    else if (strcmp(cmd, "mark_attendance") == 0 && argc >= 6)
        cmd_mark_attendance(argv[2], argv[3], atoi(argv[4]), atoi(argv[5]));
    else if (strcmp(cmd, "get_attendance") == 0 && argc >= 3)
        cmd_get_attendance(argv[2]);
    else if (strcmp(cmd, "add_marks") == 0 && argc >= 7)
        cmd_add_marks(argv[2], atoi(argv[3]), atoi(argv[4]), atof(argv[5]), atof(argv[6]));
    else if (strcmp(cmd, "get_marks") == 0 && argc >= 3)
        cmd_get_marks(argv[2]);
    else if (strcmp(cmd, "export_attendance") == 0 && argc >= 3)
        cmd_export_attendance_csv(argv[2]);
    else if (strcmp(cmd, "export_marks") == 0 && argc >= 3)
        cmd_export_marks_csv(argv[2]);
    else
        printf("ERROR:Unknown command\n");

    return 0;
}
