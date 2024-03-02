import csv

def convert_csv_to_txt(input_csv_path, output_txt_path):
    try:
        with open(input_csv_path, 'r') as csv_file:
            reader = csv.reader(csv_file)

            with open(output_txt_path, 'w') as txt_file:

                for row in reader:
                    if csv_file_path.startswith('ls'):
                        formatted_row = f"{row[0]} {row[2]} curr_max: {row[1]} TOT: 0 COMP: 0 REJ: {row[3]} INST: {row[4]}"
                    else:
                        formatted_row = f"{row[0]} {row[2]} curr_max: {row[1]} TOT: 0 COMP: 0 REJ: {row[3]} COST: 0 INST: {row[4]}"
                    txt_file.write(formatted_row + '\n')
                    

        print(f"Conversion completed. Results saved to {output_txt_path}")

    except FileNotFoundError:
        print(f"File not found: {input_csv_path}")
    except Exception as e:
        print(f"Error converting CSV file to text: {e}")


csv_file_path = './K20_k4/ls_scaling_K20_k4.csv'      
output_txt_path = './K20_k4/reactive_local_enron.txt'

convert_csv_to_txt(csv_file_path, output_txt_path)