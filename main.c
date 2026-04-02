#include <stdio.h>    // Include standard input/output library for functions like printf, fopen, fprintf
#include <stdlib.h>   // Include standard library for functions like atoi, atof, system, exit
#include <string.h>   // Include string manipulation functions like strcpy, strcmp, strlen, strcspn
#include <time.h>     // Include time functions (not directly used in this code, but included for potential future use)

#define MAX_NAME    64          // Maximum length allowed for student names
#define MAX_DATE    16          // Maximum length allowed for date strings
#define MAX_CLASSES 20          // Maximum number of classes (not used in this code)
#define MAX_STU     200         // Maximum number of students per class (not used in this code)
#define MAX_QUIZZES 20          // Maximum number of quizzes (not used in this code)
#define DATA_DIR    "cms_data"  // Directory name where data files are stored

typedef struct {  // Define a structure to represent a student
    int  roll;
    char name[MAX_NAME];
    char class_id[16];
} Student;  // End of Student structure definition

typedef struct {  // Define a structure to represent an attendance record
    int  roll;
    char date[MAX_DATE];
    int  present;
} AttendanceRecord;

typedef struct {  // Define a structure to represent a quiz record
    int  roll; 
    int  quiz_no;
    float marks;
    float max_marks;
} QuizRecord;

void ensure_dir() {  // Function to ensure the data directory exists
#ifdef _WIN32  // If compiling on Windows
    system("if not exist " DATA_DIR " mkdir " DATA_DIR);  // Use Windows command to create directory if it doesn't exist
#else  // If compiling on Unix-like systems
    system("mkdir -p " DATA_DIR);  // Use Unix command to create directory if it doesn't exist
#endif  // End of conditional compilation
}  // End of ensure_dir function

void class_file(char *out, const char *class_id, const char *suffix) {  // Function to generate file path for class-specific files
    snprintf(out, 256, DATA_DIR "/%s_%s.csv", class_id, suffix);  // Format the file path as cms_data/class_id_suffix.csv
}  // End of class_file function

void cmd_add_class(const char *class_id, const char *class_name) {  // Function to add a new class
    ensure_dir();  // Ensure the data directory exists
    FILE *fp = fopen(DATA_DIR "/classes.csv", "a");  // Open classes.csv in append mode
    if (!fp) { printf("ERROR:Cannot open classes file\n"); return; }  // If file can't be opened, print error and return
    fclose(fp);  // Close the file (this seems unnecessary, but perhaps to check if it can be opened)
    fp = fopen(DATA_DIR "/classes.csv", "r");  // Open classes.csv in read mode
    char line[256];  // Buffer to hold each line read from file
    while (fgets(line, sizeof(line), fp)) {  // Read each line from the file
        char id[64]; sscanf(line, "%63[^,]", id);  // Extract the class ID from the line (up to first comma)
        if (strcmp(id, class_id) == 0) {  // If the class ID already exists
            fclose(fp); printf("ERROR:Class ID already exists\n"); return;  // Close file, print error, and return
        }
    }
    fclose(fp);  // Close the file
    fp = fopen(DATA_DIR "/classes.csv", "a");  // Open classes.csv in append mode again
    fprintf(fp, "%s,%s\n", class_id, class_name);  // Write the new class ID and name to the file
    fclose(fp);  // Close the file
    printf("OK:Class added\n");  // Print success message
}  // End of cmd_add_class function

void cmd_list_classes() {  // Function to list all classes
    ensure_dir();  // Ensure the data directory exists
    FILE *fp = fopen(DATA_DIR "/classes.csv", "r");  // Open classes.csv in read mode
    if (!fp) { printf("CLASSES:\n"); return; }  // If file doesn't exist, print empty list and return
    printf("CLASSES:");  // Print header for classes list
    char line[256];  // Buffer for each line
    int first = 1;  // Flag to track if it's the first item
    while (fgets(line, sizeof(line), fp)) {  // Read each line
        line[strcspn(line, "\n")] = 0;  // Remove newline character from the line
        if (strlen(line) < 2) continue;  // Skip empty lines
        if (!first) printf("|");  // If not first, print separator
        printf("%s", line);  // Print the class info
        first = 0;  // Set first to false
    }
    printf("\n");  // Print newline at the end
    fclose(fp);  // Close the file
}  // End of cmd_list_classes function

void cmd_delete_class(const char *class_id) {  // Function to delete a class
    ensure_dir();  // Ensure data directory exists
    FILE *fp = fopen(DATA_DIR "/classes.csv", "r");  // Open classes.csv for reading
    FILE *tmp = fopen(DATA_DIR "/classes_tmp.csv", "w");  // Open temporary file for writing
    if (!fp || !tmp) { printf("ERROR:Cannot open file\n"); return; }  // If either file can't be opened, error
    char line[256];  // Buffer for lines
    while (fgets(line, sizeof(line), fp)) {  // Read each line
        char id[64]; sscanf(line, "%63[^,]", id);  // Extract class ID
        if (strcmp(id, class_id) != 0) fputs(line, tmp);  // If not the class to delete, write to temp file
    }
    fclose(fp); fclose(tmp);  // Close both files
    remove(DATA_DIR "/classes.csv");  // Delete the original file
    rename(DATA_DIR "/classes_tmp.csv", DATA_DIR "/classes.csv");  // Rename temp file to original
    printf("OK:Class deleted\n");  // Print success
}  // End of cmd_delete_class function

void cmd_add_student(const char *class_id, int roll, const char *name) {  // Function to add a student to a class
    ensure_dir();  // Ensure directory exists
    char path[256]; class_file(path, class_id, "students");  // Generate path for students file
    FILE *fp = fopen(path, "r");  // Open students file for reading
    if (fp) {  // If file exists
        char line[256];  // Buffer
        while (fgets(line, sizeof(line), fp)) {  // Read each line
            int r; sscanf(line, "%d", &r);  // Extract roll number
            if (r == roll) { fclose(fp); printf("ERROR:Roll already exists in class\n"); return; }  // If roll exists, error
        }
        fclose(fp);  // Close file
    }
    fp = fopen(path, "a");  // Open file in append mode
    if (!fp) { printf("ERROR:Cannot open students file\n"); return; }  // If can't open, error
    fprintf(fp, "%d,%s\n", roll, name);  // Write student info
    fclose(fp);  // Close file
    printf("OK:Student added\n");  // Success message
}  // End of cmd_add_student function

void cmd_list_students(const char *class_id) {  // Function to list students in a class
    char path[256]; class_file(path, class_id, "students");  // Generate students file path
    FILE *fp = fopen(path, "r");  // Open for reading
    if (!fp) { printf("STUDENTS:\n"); return; }  // If no file, empty list
    printf("STUDENTS:");  // Header
    char line[256]; int first = 1;  // Buffer and flag
    while (fgets(line, sizeof(line), fp)) {  // Read lines
        line[strcspn(line, "\n")] = 0;  // Remove newline
        if (strlen(line) < 2) continue;  // Skip empty
        if (!first) printf("|");  // Separator
        printf("%s", line);  // Print student
        first = 0;  // Not first
    }
    printf("\n");  // Newline
    fclose(fp);  // Close
}  // End of cmd_list_students function

void cmd_delete_student(const char *class_id, int roll) {  // Function to delete a student
    char path[256]; class_file(path, class_id, "students");  // Students file path
    FILE *fp = fopen(path, "r");  // Open for reading
    FILE *tmp = fopen(DATA_DIR "/stu_tmp.csv", "w");  // Temp file
    if (!fp || !tmp) { printf("ERROR:Cannot open file\n"); return; }  // Error if can't open
    char line[256];  // Buffer
    while (fgets(line, sizeof(line), fp)) {  // Read lines
        int r; sscanf(line, "%d", &r);  // Extract roll
        if (r != roll) fputs(line, tmp);  // If not the student, keep in temp
    }
    fclose(fp); fclose(tmp);  // Close files
    remove(path);  // Delete original
    rename(DATA_DIR "/stu_tmp.csv", path);  // Rename temp
    printf("OK:Student deleted\n");  // Success
}  // End of cmd_delete_student function

void cmd_mark_attendance(const char *class_id, const char *date, int roll, int present) {  // Function to mark attendance
    char path[256]; class_file(path, class_id, "attendance");  // Attendance file path
    FILE *fp = fopen(path, "r");  // Open for reading
    FILE *tmp = fopen(DATA_DIR "/att_tmp.csv", "w");  // Temp file
    if (fp && tmp) {  // If both opened
        char line[256];  // Buffer
        while (fgets(line, sizeof(line), fp)) {  // Read lines
            int r; char d[MAX_DATE]; int p;  // Variables for parsing
            if (sscanf(line, "%d,%15[^,],%d", &r, d, &p) == 3) {  // Parse line
                if (!(r == roll && strcmp(d, date) == 0)) fputs(line, tmp);  // If not matching record, keep
            }
        }
        fclose(fp); fclose(tmp);  // Close
        remove(path);  // Delete original
        rename(DATA_DIR "/att_tmp.csv", path);  // Rename temp
    } else { if(fp) fclose(fp); if(tmp) fclose(tmp); }  // Close if opened
    fp = fopen(path, "a");  // Open for append
    if (!fp) { printf("ERROR:Cannot open attendance file\n"); return; }  // Error
    fprintf(fp, "%d,%s,%d\n", roll, date, present);  // Write new record
    fclose(fp);  // Close
    printf("OK:Attendance marked\n");  // Success
}  // End of cmd_mark_attendance function

void cmd_get_attendance(const char *class_id) {  // Function to get attendance records
    char path[256]; class_file(path, class_id, "attendance");  // File path
    FILE *fp = fopen(path, "r");  // Open for reading
    if (!fp) { printf("ATTENDANCE:\n"); return; }  // If no file, empty
    printf("ATTENDANCE:");  // Header
    char line[256]; int first = 1;  // Buffer and flag
    while (fgets(line, sizeof(line), fp)) {  // Read lines
        line[strcspn(line, "\n")] = 0;  // Remove newline
        if (strlen(line) < 2) continue;  // Skip empty
        if (!first) printf("|");  // Separator
        printf("%s", line);  // Print record
        first = 0;  // Not first
    }
    printf("\n");  // Newline
    fclose(fp);  // Close
}  // End of cmd_get_attendance function

void cmd_add_marks(const char *class_id, int roll, int quiz_no, float marks, float max_marks) {  // Function to add quiz marks
    char path[256]; class_file(path, class_id, "marks");  // Marks file path
    FILE *fp = fopen(path, "r");  // Open for reading
    FILE *tmp = fopen(DATA_DIR "/mrk_tmp.csv", "w");  // Temp file
    if (fp && tmp) {  // If opened
        char line[256];  // Buffer
        while (fgets(line, sizeof(line), fp)) {  // Read lines
            int r, q; float m, mx;  // Variables
            if (sscanf(line, "%d,%d,%f,%f", &r, &q, &m, &mx) == 4) {  // Parse
                if (!(r == roll && q == quiz_no)) fputs(line, tmp);  // Keep if not matching
            }
        }
        fclose(fp); fclose(tmp);  // Close
        remove(path);  // Delete original
        rename(DATA_DIR "/mrk_tmp.csv", path);  // Rename temp
    } else { if(fp) fclose(fp); if(tmp) fclose(tmp); }  // Close
    fp = fopen(path, "a");  // Append
    if (!fp) { printf("ERROR:Cannot open marks file\n"); return; }  // Error
    fprintf(fp, "%d,%d,%.2f,%.2f\n", roll, quiz_no, marks, max_marks);  // Write marks
    fclose(fp);  // Close
    printf("OK:Marks added\n");  // Success
}  // End of cmd_add_marks function

void cmd_get_marks(const char *class_id) {  // Function to get marks
    char path[256]; class_file(path, class_id, "marks");  // File path
    FILE *fp = fopen(path, "r");  // Open
    if (!fp) { printf("MARKS:\n"); return; }  // Empty if no file
    printf("MARKS:");  // Header
    char line[256]; int first = 1;  // Buffer and flag
    while (fgets(line, sizeof(line), fp)) {  // Read
        line[strcspn(line, "\n")] = 0;  // Remove newline
        if (strlen(line) < 2) continue;  // Skip
        if (!first) printf("|");  // Separator
        printf("%s", line);  // Print
        first = 0;  // Not first
    }
    printf("\n");  // Newline
    fclose(fp);  // Close
}  // End of cmd_get_marks function

void cmd_export_attendance_csv(const char *class_id) {  // Function to export attendance as CSV
    char path[256]; class_file(path, class_id, "attendance");  // File path
    FILE *fp = fopen(path, "r");  // Open
    if (!fp) { printf("ERROR:No attendance data\n"); return; }  // Error if no data
    printf("roll,date,present\n");  // Print CSV header
    char line[256];  // Buffer
    while (fgets(line, sizeof(line), fp)) printf("%s", line);  // Print each line
    fclose(fp);  // Close
}  // End of cmd_export_attendance_csv function

void cmd_export_marks_csv(const char *class_id) {  // Function to export marks as CSV
    char path[256]; class_file(path, class_id, "marks");  // File path
    FILE *fp = fopen(path, "r");  // Open
    if (!fp) { printf("ERROR:No marks data\n"); return; }  // Error
    printf("roll,quiz_no,marks,max_marks\n");  // CSV header
    char line[256];  // Buffer
    while (fgets(line, sizeof(line), fp)) printf("%s", line);  // Print lines
    fclose(fp);  // Close
}  // End of cmd_export_marks_csv function

int main(int argc, char *argv[]) {  // Main function, entry point of the program
    if (argc < 2) { printf("ERROR:No command\n"); return 1; }  // If no command line arguments, error
    const char *cmd = argv[1];  // Get the command from first argument

    if (strcmp(cmd, "add_class") == 0 && argc >= 4)  // If command is add_class and enough args
        cmd_add_class(argv[2], argv[3]);  // Call add class function
    else if (strcmp(cmd, "list_classes") == 0)  // If list_classes
        cmd_list_classes();  // Call list classes
    else if (strcmp(cmd, "delete_class") == 0 && argc >= 3)  // If delete_class
        cmd_delete_class(argv[2]);  // Call delete class
    else if (strcmp(cmd, "add_student") == 0 && argc >= 5)  // If add_student
        cmd_add_student(argv[2], atoi(argv[3]), argv[4]);  // Call add student
    else if (strcmp(cmd, "list_students") == 0 && argc >= 3)  // If list_students
        cmd_list_students(argv[2]);  // Call list students
    else if (strcmp(cmd, "delete_student") == 0 && argc >= 4)  // If delete_student
        cmd_delete_student(argv[2], atoi(argv[3]));  // Call delete student
    else if (strcmp(cmd, "mark_attendance") == 0 && argc >= 6)  // If mark_attendance
        cmd_mark_attendance(argv[2], argv[3], atoi(argv[4]), atoi(argv[5]));  // Call mark attendance
    else if (strcmp(cmd, "get_attendance") == 0 && argc >= 3)  // If get_attendance
        cmd_get_attendance(argv[2]);  // Call get attendance
    else if (strcmp(cmd, "add_marks") == 0 && argc >= 7)  // If add_marks
        cmd_add_marks(argv[2], atoi(argv[3]), atoi(argv[4]), atof(argv[5]), atof(argv[6]));  // Call add marks
    else if (strcmp(cmd, "get_marks") == 0 && argc >= 3)  // If get_marks
        cmd_get_marks(argv[2]);  // Call get marks
    else if (strcmp(cmd, "export_attendance") == 0 && argc >= 3)  // If export_attendance
        cmd_export_attendance_csv(argv[2]);  // Call export attendance
    else if (strcmp(cmd, "export_marks") == 0 && argc >= 3)  // If export_marks
        cmd_export_marks_csv(argv[2]);  // Call export marks
    else
        printf("ERROR:Unknown command\n");  // If unknown command, error

    return 0;  // Return 0 to indicate successful execution
}  // End of main function
