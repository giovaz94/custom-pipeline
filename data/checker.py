import sys

def parse_line_local(line):
    parts = line.split()
    i = int(parts[0])
    x = float(parts[1])
    comp = float(parts[7])
    rej = float(parts[9])
    inst = float(parts[11])
    return i, x, comp, rej, inst

def parse_line_global(line):
    parts = line.split()
    i = int(parts[0])
    x = float(parts[1])
    comp = float(parts[7])
    rej = float(parts[9])
    inst = int(parts[13])
    return i, x, comp, rej, inst

def process_files(file1, file2):
    with open(file1, 'r') as f1, open(file2, 'r') as f2:
        lines1 = f1.readlines()
        lines2 = f2.readlines()
    
    result = []
    for line1, line2 in zip(lines1, lines2):
        i1, x1, comp1, rej1, inst1 = parse_line_local(line1)
        i2, x2, comp2, rej2, inst2 = parse_line_global(line2)
        
        if i1 != i2:
            raise ValueError(f"Line index mismatch: {i1} vs {i2}")
        
        diff_x = x2 - x1
        diff_comp = comp2 - comp1
        diff_rej = rej2 - rej1
        diff_inst = inst2 - inst1
        
        result.append(f"{i1} {diff_x:.1f} comp: {diff_comp:.1f} rej: {diff_rej:.1f} inst: {diff_inst}")
    
    return result

def main():
    
    file_local = sys.argv[1]
    file_global = sys.argv[2]
    
    result = process_files(file_local, file_global)
    
    for line in result:
        print(line)

if __name__ == "__main__":
    main()
